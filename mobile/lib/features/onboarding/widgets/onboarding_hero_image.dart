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
    return ClipRRect(
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
                    AppColors.background.withValues(alpha: 0.15),
                    AppColors.background.withValues(alpha: 0.85),
                  ],
                  stops: const [0.45, 0.75, 1.0],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
