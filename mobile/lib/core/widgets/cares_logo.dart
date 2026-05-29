import 'package:flutter/material.dart';
import '../constants/app_assets.dart';

class CaresLogo extends StatelessWidget {
  const CaresLogo({
    super.key,
    this.size = 160,
    this.showShadow = true,
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
    );

    if (!showShadow) return image;

    return DecoratedBox(
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.12),
            blurRadius: 24,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: image,
    );
  }
}
