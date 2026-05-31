import 'package:flutter/material.dart';
import '../constants/app_assets.dart';
import '../theme/app_theme.dart';

class CaresLogo extends StatelessWidget {
  const CaresLogo({
    super.key,
    this.size = 160,
    this.showShadow = false,
  });

  final double size;
  final bool showShadow;

  @override
  Widget build(BuildContext context) {
    final image = Image.asset(
      AppAssets.caresLogo,
      width: size,
      height: size,
      fit: BoxFit.contain,
      filterQuality: FilterQuality.high,
      gaplessPlayback: true,
    );

    if (!showShadow) return image;

    return DecoratedBox(
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.22),
            blurRadius: size * 0.18,
            spreadRadius: size * 0.01,
            offset: Offset(0, size * 0.06),
          ),
          BoxShadow(
            color: AppColors.accent.withValues(alpha: 0.12),
            blurRadius: size * 0.28,
            spreadRadius: size * 0.02,
            offset: Offset(0, size * 0.1),
          ),
        ],
      ),
      child: image,
    );
  }
}
