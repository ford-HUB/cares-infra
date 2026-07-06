import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme.dart';

/// Static floating mascot — no idle motion; faces toward the board when on the right.
class MascotHero extends StatelessWidget {
  const MascotHero({
    super.key,
    required this.poseAsset,
    required this.faceRight,
    this.width = 130,
  });

  final String poseAsset;
  final bool faceRight;
  final double width;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.12),
            blurRadius: 16,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: AnimatedSwitcher(
        duration: const Duration(milliseconds: 380),
        switchInCurve: Curves.easeOutBack,
        switchOutCurve: Curves.easeIn,
        transitionBuilder: (child, animation) {
          return FadeTransition(
            opacity: animation,
            child: ScaleTransition(
              scale: Tween<double>(begin: 0.94, end: 1).animate(animation),
              child: child,
            ),
          );
        },
        child: Transform(
          key: ValueKey(poseAsset),
          alignment: Alignment.center,
          transform: Matrix4.identity()..scale(faceRight ? -1.0 : 1.0, 1.0),
          child: Image.asset(
            poseAsset,
            width: width,
            fit: BoxFit.contain,
            filterQuality: FilterQuality.high,
          ),
        ),
      ),
    );
  }
}
