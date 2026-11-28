import 'dart:isolate';
import 'dart:typed_data';

import 'package:google_mlkit_face_detection/google_mlkit_face_detection.dart';
import 'package:google_mlkit_text_recognition/google_mlkit_text_recognition.dart';
import 'package:image_picker/image_picker.dart';
import 'package:mobile/features/auth/domain/id_image_quality.dart';

class IdImageCheckResult {
  const IdImageCheckResult({
    required this.side,
    required this.issues,
    this.recognizedText = '',
    this.missingFields = const [],
  });

  final IdCardSide side;
  final List<IdImageIssue> issues;

  /// On-device OCR text, used later to cross-check the server's extraction.
  final String recognizedText;

  /// For [IdImageIssue.missingIdDetails]: which fields weren't found.
  final List<String> missingFields;

  bool get passed => issues.isEmpty;

  /// Every issue is a layout question, not a bad photo.
  bool get overridable =>
      issues.isNotEmpty && issues.every((issue) => issue.overridable);
}

/// On-device only: pixel quality, then text readability and key details, then
/// (front) portrait sharpness.
class IdImagePreValidator {
  IdImagePreValidator({this.checkPortrait = true, this.staffId = false});

  /// A blurry ID portrait later fails the face scan, so catch it here.
  final bool checkPortrait;

  /// Staff IDs print the number and name differently.
  final bool staffId;

  /// Pass the front's text when checking the back, so fields can span both
  /// sides.
  Future<IdImageCheckResult> check(
    XFile file,
    IdCardSide side, {
    String? frontText,
  }) async {
    final bytes = await file.readAsBytes();
    final metrics = await Isolate.run(() => IdImageQualityRules.measure(bytes));
    if (metrics == null) {
      return IdImageCheckResult(
        side: side,
        issues: const [IdImageIssue.unreadableFile],
      );
    }

    final qualityIssues = IdImageQualityRules.evaluate(metrics);
    // A photo too poor to read gives meaningless OCR, so stop at the cause.
    if (qualityIssues.isNotEmpty) {
      return IdImageCheckResult(side: side, issues: qualityIssues);
    }

    final text = await recognizeText(file);
    if (!IdTextReadabilityRules.isReadable(side, text)) {
      return IdImageCheckResult(
        side: side,
        issues: const [IdImageIssue.noReadableText],
        recognizedText: text,
      );
    }

    final missing = side == IdCardSide.front
        ? IdTextReadabilityRules.missingKeyFields(
            frontText: text,
            staffId: staffId,
          )
        : IdTextReadabilityRules.missingKeyFields(
            frontText: frontText ?? '',
            backText: text,
            staffId: staffId,
          );
    final portraitIssue = side == IdCardSide.front && checkPortrait
        ? await _portraitIssue(file, bytes)
        : null;
    return IdImageCheckResult(
      side: side,
      issues: [
        if (missing.isNotEmpty) IdImageIssue.missingIdDetails,
        ?portraitIssue,
      ],
      recognizedText: text,
      missingFields: missing,
    );
  }

  /// Detector failures aren't held against the photo.
  Future<IdImageIssue?> _portraitIssue(XFile file, Uint8List bytes) async {
    final detector = FaceDetector(
      options: FaceDetectorOptions(
        performanceMode: FaceDetectorMode.accurate,
        // An ID portrait is a small part of the card.
        minFaceSize: 0.05,
      ),
    );
    try {
      final faces = await detector.processImage(
        InputImage.fromFilePath(file.path),
      );
      if (faces.isEmpty) return IdImageIssue.faceNotFound;

      final box = faces
          .map((face) => face.boundingBox)
          .reduce((a, b) => a.width * a.height >= b.width * b.height ? a : b);
      final sharpness = await Isolate.run(
        () => IdImageQualityRules.measureRegionSharpness(
          bytes,
          left: box.left.round(),
          top: box.top.round(),
          width: box.width.round(),
          height: box.height.round(),
        ),
      );
      if (sharpness == null) return null;
      return sharpness < IdImageQualityThresholds.minFaceSharpness
          ? IdImageIssue.faceBlurry
          : null;
    } catch (_) {
      return null;
    } finally {
      await detector.close();
    }
  }

  Future<String> recognizeText(XFile file) async {
    final recognizer = TextRecognizer(script: TextRecognitionScript.latin);
    try {
      final result = await recognizer.processImage(
        InputImage.fromFilePath(file.path),
      );
      return result.text;
    } finally {
      await recognizer.close();
    }
  }
}
