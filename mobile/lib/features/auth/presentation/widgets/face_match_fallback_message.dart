import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme.dart';

/// Shown when the selfie keeps failing to match (usually a blurry ID photo);
/// offers manual registration like [IdRecognitionFallbackMessage].
class FaceMatchFallbackMessage extends StatelessWidget {
  const FaceMatchFallbackMessage({
    super.key,
    required this.onManualRegistration,
    this.idLabel = 'ID',
  });

  /// Null while a match is still being checked, which disables the button.
  final VoidCallback? onManualRegistration;

  /// How the card names the ID, e.g. `alumni ID`.
  final String idLabel;

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
                  'We couldn\'t match your face to your $idLabel',
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
            child: Text(
              'The photo on your $idLabel may be too blurry or unclear to '
              'match. Keep trying with good lighting, or continue with Manual '
              'Registration.',
              style: TextStyle(fontSize: 12.5, height: 1.35, color: muted),
            ),
          ),
          const SizedBox(height: 12),
          FilledButton(
            key: const ValueKey('face-fallback-manual'),
            onPressed: onManualRegistration,
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              minimumSize: const Size.fromHeight(46),
              padding: const EdgeInsets.symmetric(horizontal: 12),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
              ),
            ),
            child: const Text(
              'Manual Registration',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Manual Registration skips the face scan. You type your details '
            'in, and a CARES director reviews your $idLabel before your '
            'account opens.',
            style: TextStyle(fontSize: 11.5, height: 1.35, color: muted),
          ),
        ],
      ),
    );
  }
}
