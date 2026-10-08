import 'dart:isolate';

import 'package:google_mlkit_text_recognition/google_mlkit_text_recognition.dart';
import 'package:image_picker/image_picker.dart';
import 'package:mobile/features/auth/domain/id_image_quality.dart';

/// Outcome of pre-validating one side of an ID before it is accepted.
class IdImageCheckResult {
  const IdImageCheckResult({
    required this.side,
    required this.issues,
    this.recognizedText = '',
    this.missingFields = const [],
  });

  final IdCardSide side;
  final List<IdImageIssue> issues;

  /// What on-device OCR read off this side; kept so the server's extraction
  /// can be cross-checked and its blanks filled later.
  final String recognizedText;

  /// For [IdImageIssue.missingIdDetails]: which fields weren't found.
  final List<String> missingFields;

  bool get passed => issues.isEmpty;

  /// Every issue is a layout question, not a bad photo.
  bool get overridable =>
      issues.isNotEmpty && issues.every((issue) => issue.overridable);
}

/// Checks an ID photo on-device: pixel quality first (blur, exposure, glare,
/// size), then whether its text is readable and the identifying details can be
/// found. Nothing is uploaded here.
class IdImagePreValidator {
  /// [frontText] is the front's recognised text; pass it when checking the
  /// back so the name / ID number can be looked for across both sides.
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
        ? IdTextReadabilityRules.missingKeyFields(frontText: text)
        : IdTextReadabilityRules.missingKeyFields(
            frontText: frontText ?? '',
            backText: text,
          );
    return IdImageCheckResult(
      side: side,
      issues: missing.isEmpty ? const [] : const [IdImageIssue.missingIdDetails],
      recognizedText: text,
      missingFields: missing,
    );
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
