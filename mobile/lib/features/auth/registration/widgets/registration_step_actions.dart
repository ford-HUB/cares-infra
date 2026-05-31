import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';

class RegistrationStepActions extends StatelessWidget {
  const RegistrationStepActions({
    super.key,
    required this.onBack,
    required this.onContinue,
    this.continueLabel = 'Continue',
    this.continueEnabled = true,
    this.showBack = true,
    this.isLoading = false,
  });

  final VoidCallback? onBack;
  final VoidCallback? onContinue;
  final String continueLabel;
  final bool continueEnabled;
  final bool showBack;
  final bool isLoading;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        if (showBack) ...[
          Expanded(
            child: OutlinedButton(
              onPressed: onBack,
              style: OutlinedButton.styleFrom(
                minimumSize: const Size(0, 52),
                foregroundColor: AppColors.textPrimary,
                side: BorderSide(color: AppColors.primary.withValues(alpha: 0.25)),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: const Text('Back'),
            ),
          ),
          const SizedBox(width: 12),
        ],
        Expanded(
          flex: showBack ? 2 : 1,
          child: FilledButton(
            onPressed: continueEnabled && !isLoading ? onContinue : null,
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              disabledBackgroundColor: AppColors.inputFill,
              disabledForegroundColor: AppColors.textMuted,
              minimumSize: const Size(0, 52),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            child: isLoading
                ? const SizedBox(
                    width: 22,
                    height: 22,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : Text(
                    continueLabel,
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
          ),
        ),
      ],
    );
  }
}
