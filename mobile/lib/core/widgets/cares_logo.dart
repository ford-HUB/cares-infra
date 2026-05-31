import 'package:flutter/material.dart';
import '../constants/app_assets.dart';

class CaresLogo extends StatelessWidget {
  const CaresLogo({
    super.key,
    this.size = 160,
  });

  final double size;

  @override
  Widget build(BuildContext context) {
    return Image.asset(
      AppAssets.caresLogo,
      width: size,
      height: size,
      fit: BoxFit.contain,
      filterQuality: FilterQuality.high,
      gaplessPlayback: true,
    );
  }
}
