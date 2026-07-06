import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme.dart';

class RegisterStepIndicator extends StatelessWidget {
  const RegisterStepIndicator({
    super.key,
    required this.currentStep,
    required this.labels,
  });

  final int currentStep;
  final List<String> labels;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: List.generate(labels.length, (index) {
            final isActive = index <= currentStep;
            final isCurrent = index == currentStep;
            return Expanded(
              child: Row(
                children: [
                  Expanded(
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 300),
                      height: 4,
                      decoration: BoxDecoration(
                        color: isActive
                            ? (isCurrent
                                ? AppColors.primary
                                : AppColors.secondary)
                            : AppColors.fieldBorder,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  if (index < labels.length - 1) const SizedBox(width: 6),
                ],
              ),
            );
          }),
        ),
        const SizedBox(height: 10),
        Text(
          'Step ${currentStep + 1} of ${labels.length} · ${labels[currentStep]}',
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: AppColors.primary.withValues(alpha: 0.85),
          ),
        ),
      ],
    );
  }
}
