import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';

class RegistrationProgressHeader extends StatelessWidget {
  const RegistrationProgressHeader({
    super.key,
    required this.currentStep,
    required this.totalSteps,
    this.title,
  });

  final int currentStep;
  final int totalSteps;
  final String? title;

  @override
  Widget build(BuildContext context) {
    final progress = currentStep / totalSteps;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Step $currentStep of $totalSteps',
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: AppColors.textSecondary,
              ),
            ),
            Text(
              '${(progress * 100).round()}%',
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: AppColors.accent,
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            value: progress,
            minHeight: 6,
            backgroundColor: AppColors.inputFill,
            color: AppColors.accent,
          ),
        ),
        if (title != null) ...[
          const SizedBox(height: 24),
          Text(
            title!,
            style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                  fontSize: 24,
                  fontWeight: FontWeight.w800,
                  color: AppColors.textPrimary,
                ),
          ),
        ],
      ],
    );
  }
}
