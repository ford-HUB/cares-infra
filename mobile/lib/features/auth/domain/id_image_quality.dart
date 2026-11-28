import 'dart:math' as math;
import 'dart:typed_data';

import 'package:image/image.dart' as img;
import 'package:mobile/features/auth/domain/register_ocr_raw_parser.dart';

enum IdCardSide { front, back }

extension IdCardSideX on IdCardSide {
  String get label => this == IdCardSide.front ? 'front' : 'back';
}

/// Quality issues always block; [missingIdDetails] and portrait checks depend
/// on layout or a fallible detector, so they're [overridable] after repeated
/// attempts.
enum IdImageIssue {
  unreadableFile,
  tooSmall,
  tooDark,
  overexposed,
  glare,
  blurry,
  lowContrast,
  noReadableText,
  missingIdDetails,

  faceNotFound,

  /// The face scan is matched against it.
  faceBlurry;

  bool get overridable =>
      this == IdImageIssue.missingIdDetails ||
      this == IdImageIssue.faceNotFound ||
      this == IdImageIssue.faceBlurry;

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
    IdImageIssue.faceNotFound => 'The photo on your ID can\'t be seen',
    IdImageIssue.faceBlurry => 'The photo on your ID is blurry',
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
    IdImageIssue.faceNotFound || IdImageIssue.faceBlurry =>
      'Keep your portrait on the ID in focus and free of glare or fingers — '
          'the face scan is matched against it.',
  };
}

/// Measured on a downscaled greyscale copy so thresholds ignore camera
/// resolution.
class IdImageQualityMetrics {
  const IdImageQualityMetrics({
    required this.width,
    required this.height,
    required this.meanLuma,
    required this.lumaStdDev,
    required this.glareRatio,
    required this.sharpness,
  });

  /// Original, orientation-corrected.
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

/// Tune here, not in the widget.
abstract final class IdImageQualityThresholds {
  /// Sharpness is resolution-dependent, so every photo is measured at this
  /// size.
  static const analysisLongSide = 1000;

  /// Below this the 8-digit ID is too small and OCR flips digits (5/6, 8/9).
  static const minLongSide = 1280;
  static const minShortSide = 960;
  static const minMeanLuma = 55.0;
  static const maxMeanLuma = 220.0;
  static const glareLuma = 250;
  static const maxGlareRatio = 0.06;
  static const minLumaStdDev = 22.0;
  static const minSharpness = 45.0;

  /// Fixed width so portrait sharpness ignores the card's size in the photo.
  static const faceAnalysisWidth = 160;

  /// Faces have fewer hard edges than text, so well below [minSharpness]; tune
  /// on real IDs.
  static const minFaceSharpness = 20.0;

  /// Alphanumeric characters / text lines ML Kit must read off a side.
  static const minFrontChars = 30;
  static const minFrontLines = 3;
  static const minBackChars = 15;
  static const minBackLines = 2;
}

abstract final class IdImageQualityRules {
  /// Null when not an image. CPU-bound: run off the UI isolate.
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

  /// Region in ML Kit's orientation-corrected face-box space. Null when not an
  /// image or empty; run off the UI isolate.
  static double? measureRegionSharpness(
    Uint8List bytes, {
    required int left,
    required int top,
    required int width,
    required int height,
  }) {
    img.Image? decoded;
    try {
      decoded = img.decodeImage(bytes);
    } catch (_) {
      return null;
    }
    if (decoded == null) return null;
    final oriented = img.bakeOrientation(decoded);

    final x = left.clamp(0, oriented.width - 1);
    final y = top.clamp(0, oriented.height - 1);
    final w = math.min(width, oriented.width - x);
    final h = math.min(height, oriented.height - y);
    if (w < 8 || h < 8) return null;

    final crop = img.copyResize(
      img.copyCrop(oriented, x: x, y: y, width: w, height: h),
      width: IdImageQualityThresholds.faceAnalysisWidth,
      interpolation: img.Interpolation.average,
    );
    final luma = Float64List(crop.width * crop.height);
    var i = 0;
    for (final pixel in crop) {
      luma[i++] = 0.299 * pixel.r + 0.587 * pixel.g + 0.114 * pixel.b;
    }
    return _laplacianVariance(luma, crop.width, crop.height);
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

  /// Most fundamental first (a dark photo is also low-contrast).
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

  /// Front only: name or ID number suffices; with both sides, both are
  /// required.
  static List<String> missingKeyFields({
    required String frontText,
    String? backText,
    bool staffId = false,
  }) {
    final parsed = RegisterOcrRawParser.parse(
      frontText,
      backText ?? '',
      staffId: staffId,
    );
    final hasName =
        parsed.firstname.trim().isNotEmpty && parsed.lastname.trim().isNotEmpty;
    final hasIdNumber = parsed.idNumber.trim().isNotEmpty;

    if (backText == null) {
      return hasName || hasIdNumber ? const [] : const ['name', 'ID number'];
    }
    return [if (!hasName) 'name', if (!hasIdNumber) 'ID number'];
  }
}
