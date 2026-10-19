import 'dart:math' as math;
import 'dart:typed_data';

import 'package:image/image.dart' as img;
import 'package:mobile/features/auth/domain/register_ocr_raw_parser.dart';

enum IdCardSide { front, back }

extension IdCardSideX on IdCardSide {
  String get label => this == IdCardSide.front ? 'front' : 'back';
}

/// Why a photo of one side of an ID was rejected before upload.
///
/// Image-quality issues can always be fixed by retaking the photo, so they
/// always block. [missingIdDetails] depends on how the ID is laid out, so
/// it can be overridden after repeated attempts ([overridable]).
enum IdImageIssue {
  unreadableFile,
  tooSmall,
  tooDark,
  overexposed,
  glare,
  blurry,
  lowContrast,
  noReadableText,
  missingIdDetails;

  bool get overridable => this == IdImageIssue.missingIdDetails;

  String get title => switch (this) {
    IdImageIssue.unreadableFile => 'The photo could not be opened',
    IdImageIssue.tooSmall => 'The photo is too small',
    IdImageIssue.tooDark => 'The photo is too dark',
    IdImageIssue.overexposed => 'The photo is too bright',
    IdImageIssue.glare => 'There is glare on the ID',
    IdImageIssue.blurry => 'The photo is blurry',
    IdImageIssue.lowContrast => 'The photo is washed out',
    IdImageIssue.noReadableText => 'The text on the ID can\'t be read',
    IdImageIssue.missingIdDetails => 'Key details couldn\'t be found',
  };

  String get tip => switch (this) {
    IdImageIssue.unreadableFile => 'Choose a JPG or PNG photo of your ID.',
    IdImageIssue.tooSmall =>
      'Move closer so the ID fills most of the frame, or pick a '
          'higher-resolution photo.',
    IdImageIssue.tooDark =>
      'Retake it in a brighter spot or near a window. Avoid shadows over '
          'the card.',
    IdImageIssue.overexposed =>
      'Move away from direct light or turn off the flash.',
    IdImageIssue.glare =>
      'Tilt the card slightly or move away from overhead lights so no '
          'bright spots cover the text.',
    IdImageIssue.blurry =>
      'Hold the phone steady, tap the screen to focus, and keep the card '
          'flat.',
    IdImageIssue.lowContrast =>
      'Place the ID on a plain, darker surface in even light.',
    IdImageIssue.noReadableText =>
      'Make sure the whole card is in frame, in focus and not covered by '
          'your fingers.',
    IdImageIssue.missingIdDetails =>
      'Retake the photo straight on with every edge of the card visible.',
  };
}

/// Pixel statistics for one photo, measured on a downscaled greyscale copy so
/// thresholds behave the same whatever resolution the camera produced.
class IdImageQualityMetrics {
  const IdImageQualityMetrics({
    required this.width,
    required this.height,
    required this.meanLuma,
    required this.lumaStdDev,
    required this.glareRatio,
    required this.sharpness,
  });

  /// Size of the original (orientation-corrected) image.
  final int width;
  final int height;

  /// 0–255 average brightness.
  final double meanLuma;

  /// Spread of brightness; low means washed out / flat.
  final double lumaStdDev;

  /// Share of pixels that are blown out to near-white.
  final double glareRatio;

  /// Variance of the Laplacian; low means few crisp edges, i.e. blur.
  final double sharpness;
}

/// Thresholds for [IdImageQualityRules]. Tune here, not in the widget.
abstract final class IdImageQualityThresholds {
  /// Longest side the analysis runs at. Sharpness is resolution-dependent,
  /// so every photo is measured at this size.
  static const analysisLongSide = 1000;

  /// Below roughly this size the 8-digit student ID is only a few pixels tall
  /// and OCR starts flipping digits (5/6, 8/9), so ask for a sharper photo.
  static const minLongSide = 1280;
  static const minShortSide = 960;
  static const minMeanLuma = 55.0;
  static const maxMeanLuma = 220.0;
  static const glareLuma = 250;
  static const maxGlareRatio = 0.06;
  static const minLumaStdDev = 22.0;
  static const minSharpness = 45.0;

  /// Alphanumeric characters / text lines ML Kit must read off a side.
  static const minFrontChars = 30;
  static const minFrontLines = 3;
  static const minBackChars = 15;
  static const minBackLines = 2;
}

abstract final class IdImageQualityRules {
  /// Decodes [bytes] and measures them. Returns null when the file is not an
  /// image. Pure CPU work — run it off the UI isolate.
  static IdImageQualityMetrics? measure(Uint8List bytes) {
    img.Image? decoded;
    try {
      decoded = img.decodeImage(bytes);
    } catch (_) {
      // Format sniffing throws on truncated or non-image data.
      return null;
    }
    if (decoded == null) return null;
    final oriented = img.bakeOrientation(decoded);

    final longSide = oriented.width > oriented.height
        ? oriented.width
        : oriented.height;
    final scaled = longSide > IdImageQualityThresholds.analysisLongSide
        ? img.copyResize(
            oriented,
            width: oriented.width >= oriented.height
                ? IdImageQualityThresholds.analysisLongSide
                : null,
            height: oriented.height > oriented.width
                ? IdImageQualityThresholds.analysisLongSide
                : null,
            interpolation: img.Interpolation.average,
          )
        : oriented;

    final w = scaled.width;
    final h = scaled.height;
    final luma = Float64List(w * h);
    var sum = 0.0;
    var glare = 0;
    var i = 0;
    for (final pixel in scaled) {
      final value = 0.299 * pixel.r + 0.587 * pixel.g + 0.114 * pixel.b;
      luma[i++] = value;
      sum += value;
      if (value >= IdImageQualityThresholds.glareLuma) glare++;
    }

    final count = luma.length;
    final mean = sum / count;
    var varianceSum = 0.0;
    for (final value in luma) {
      varianceSum += (value - mean) * (value - mean);
    }

    return IdImageQualityMetrics(
      width: oriented.width,
      height: oriented.height,
      meanLuma: mean,
      lumaStdDev: math.sqrt(varianceSum / count),
      glareRatio: glare / count,
      sharpness: _laplacianVariance(luma, w, h),
    );
  }

  static double _laplacianVariance(Float64List luma, int w, int h) {
    if (w < 3 || h < 3) return 0;
    var sum = 0.0;
    var sumSq = 0.0;
    var n = 0;
    for (var y = 1; y < h - 1; y++) {
      final row = y * w;
      for (var x = 1; x < w - 1; x++) {
        final c = row + x;
        final lap =
            4 * luma[c] - luma[c - 1] - luma[c + 1] - luma[c - w] - luma[c + w];
        sum += lap;
        sumSq += lap * lap;
        n++;
      }
    }
    final mean = sum / n;
    return sumSq / n - mean * mean;
  }

  /// Image-quality problems, most fundamental first, so the banner leads with
  /// the one most likely to fix the rest (a dark photo is also low-contrast).
  static List<IdImageIssue> evaluate(IdImageQualityMetrics m) {
    final issues = <IdImageIssue>[];
    final longSide = m.width > m.height ? m.width : m.height;
    final shortSide = m.width > m.height ? m.height : m.width;

    if (longSide < IdImageQualityThresholds.minLongSide ||
        shortSide < IdImageQualityThresholds.minShortSide) {
      issues.add(IdImageIssue.tooSmall);
    }
    if (m.meanLuma < IdImageQualityThresholds.minMeanLuma) {
      issues.add(IdImageIssue.tooDark);
    } else if (m.meanLuma > IdImageQualityThresholds.maxMeanLuma) {
      issues.add(IdImageIssue.overexposed);
    } else if (m.glareRatio > IdImageQualityThresholds.maxGlareRatio) {
      issues.add(IdImageIssue.glare);
    }
    if (m.sharpness < IdImageQualityThresholds.minSharpness) {
      issues.add(IdImageIssue.blurry);
    }
    if (!issues.contains(IdImageIssue.tooDark) &&
        !issues.contains(IdImageIssue.overexposed) &&
        m.lumaStdDev < IdImageQualityThresholds.minLumaStdDev) {
      issues.add(IdImageIssue.lowContrast);
    }
    return issues;
  }
}

/// Checks that the on-device OCR text of a side is readable, and that the
/// details registration needs can actually be found on the card.
abstract final class IdTextReadabilityRules {
  static bool isReadable(IdCardSide side, String text) {
    final chars = RegExp(r'[A-Za-z0-9]').allMatches(text).length;
    final lines = text
        .split('\n')
        .where((line) => RegExp(r'[A-Za-z0-9]{2,}').hasMatch(line))
        .length;
    return side == IdCardSide.front
        ? chars >= IdImageQualityThresholds.minFrontChars &&
              lines >= IdImageQualityThresholds.minFrontLines
        : chars >= IdImageQualityThresholds.minBackChars &&
              lines >= IdImageQualityThresholds.minBackLines;
  }

  /// Labels of the identifying fields that can't be read from [frontText]
  /// and [backText] combined. With only the front available, finding either
  /// the name or the ID number is enough to show it is the right side; once
  /// both sides are in, both must be found.
  static List<String> missingKeyFields({
    required String frontText,
    String? backText,
  }) {
    final parsed = RegisterOcrRawParser.parse(frontText, backText ?? '');
    final hasName =
        parsed.firstname.trim().isNotEmpty && parsed.lastname.trim().isNotEmpty;
    final hasIdNumber = parsed.idNumber.trim().isNotEmpty;

    if (backText == null) {
      return hasName || hasIdNumber ? const [] : const ['name', 'ID number'];
    }
    return [if (!hasName) 'name', if (!hasIdNumber) 'ID number'];
  }
}
