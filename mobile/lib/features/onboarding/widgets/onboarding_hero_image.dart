import 'package:flutter/material.dart';
import '../../../core/constants/app_assets.dart';
import '../../../core/theme/app_theme.dart';

enum OnboardingIllustrationType { impact, transparency, community }

extension OnboardingIllustrationAsset on OnboardingIllustrationType {
  String get assetPath => switch (this) {
        OnboardingIllustrationType.impact => AppAssets.onboardingImpact,
        OnboardingIllustrationType.transparency => AppAssets.onboardingDiscover,
        OnboardingIllustrationType.community => AppAssets.onboardingWelcome,
      };
}

class OnboardingHeroImage extends StatelessWidget {
  const OnboardingHeroImage({
    super.key,
    required this.type,
  });

  final OnboardingIllustrationType type;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(28),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.18),
            blurRadius: 24,
            spreadRadius: 1,
            offset: const Offset(0, 10),
          ),
          BoxShadow(
            color: AppColors.accent.withValues(alpha: 0.1),
            blurRadius: 40,
            spreadRadius: 2,
            offset: const Offset(0, 16),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(28),
        child: AspectRatio(
          aspectRatio: 4 / 3,
          child: Stack(
            fit: StackFit.expand,
            children: [
              Image.asset(
                type.assetPath,
                fit: BoxFit.cover,
              ),
              DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      Colors.transparent,
                      AppColors.primary.withValues(alpha: 0.08),
                      AppColors.background.withValues(alpha: 0.88),
                    ],
                    stops: const [0.45, 0.75, 1.0],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
