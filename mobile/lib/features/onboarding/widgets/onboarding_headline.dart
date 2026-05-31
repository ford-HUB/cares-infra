import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';

class OnboardingHeadline extends StatelessWidget {
  const OnboardingHeadline({
    super.key,
    required this.text,
  });

  final String text;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          width: 48,
          height: 4,
          decoration: BoxDecoration(
            color: AppColors.accentBright,
            borderRadius: BorderRadius.circular(2),
          ),
        ),
        const SizedBox(height: 20),
        Text(
          text,
          style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                fontSize: 26,
                fontWeight: FontWeight.w800,
                color: AppColors.primary,
                height: 1.25,
              ),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }
}
