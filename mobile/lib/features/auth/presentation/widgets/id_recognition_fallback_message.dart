import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/auth/data/id_image_pre_validator.dart';
import 'package:mobile/features/auth/domain/id_image_quality.dart';

/// Shown in place of the plain rejection banner for staff and alumni sign-ups
/// when an ID photo is blurry, unclear, or read with low accuracy. Besides
/// retaking the photo, the registrant can:
///
/// * [onProceedAnyway] — keep this photo and continue the standard sign-up;
/// * [onManualRegistration] — switch to manual registration: no photo check
///   and no face scan, the details are typed in, and a director reviews the
///   uploaded ID through the Request module before the account opens.
class IdRecognitionFallbackMessage extends StatelessWidget {
  const IdRecognitionFallbackMessage({
    super.key,
    required this.result,
    required this.onProceedAnyway,
    required this.onManualRegistration,
  });

  final IdImageCheckResult result;
  final VoidCallback onProceedAnyway;
  final VoidCallback onManualRegistration;

  /// Issues that mean the photo is an ID the app just couldn't read well. A
  /// file that isn't an image at all has to be picked again.
  static bool offeredFor(IdImageCheckResult result) =>
      result.issues.isNotEmpty &&
      !result.issues.contains(IdImageIssue.unreadableFile);

  String _titleFor(IdImageIssue issue) {
    if (issue != IdImageIssue.missingIdDetails ||
        result.missingFields.isEmpty) {
      return issue.title;
    }
    return 'We couldn\'t read your ${result.missingFields.join(' and ')}';
  }

  @override
  Widget build(BuildContext context) {
    final muted = AppColors.primaryDark.withValues(alpha: 0.8);

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.warning.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.warning.withValues(alpha: 0.45)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(
                Icons.report_gmailerrorred_rounded,
                color: AppColors.accentOrange,
                size: 22,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'We couldn\'t properly recognize your ID',
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                    color: AppColors.accentOrange,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Padding(
            padding: const EdgeInsets.only(left: 30),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'The ${result.side.label} photo looks blurry or unclear, or '
                  'its details couldn\'t be read accurately:',
                  style: TextStyle(fontSize: 12.5, height: 1.35, color: muted),
                ),
                const SizedBox(height: 6),
                for (final issue in result.issues)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 2),
                    child: Text(
                      '•  ${_titleFor(issue)}',
                      style: const TextStyle(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w700,
                        color: AppColors.primaryDark,
                      ),
                    ),
                  ),
                const SizedBox(height: 6),
                Text(
                  'Retake it with the buttons below, or choose how to continue.',
                  style: TextStyle(fontSize: 12.5, height: 1.35, color: muted),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  key: const ValueKey('id-fallback-proceed'),
                  onPressed: onProceedAnyway,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.primary,
                    side: const BorderSide(color: AppColors.primary),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                  child: const Text('Proceed Anyway'),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: FilledButton(
                  key: const ValueKey('id-fallback-manual'),
                  onPressed: onManualRegistration,
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                  child: const Text('Manual Registration'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            'Manual Registration skips the automatic ID check and the face '
            'scan. You type your details in, and a CARES director reviews your '
            'ID before your account opens.',
            style: TextStyle(fontSize: 11.5, height: 1.35, color: muted),
          ),
        ],
      ),
    );
  }
}
