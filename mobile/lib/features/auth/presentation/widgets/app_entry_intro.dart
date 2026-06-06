import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:mobile/core/constants/app_assets.dart';
import 'package:mobile/core/constants/app_copy.dart';
import 'package:mobile/core/theme/app_theme.dart';

/// Splash intro — logo rolls in, then the app name types letter-by-letter.
///
/// Curves and stagger timing follow [AnimatedIllustration] (elastic logo) and
/// [LoginScreen] header fade/slide intervals.
class AppEntryIntro extends StatelessWidget {
  const AppEntryIntro({
    super.key,
    required this.progress,
  });

  /// Master animation value in [0, 1].
  final double progress;

  @override
  Widget build(BuildContext context) {
    final letters = AppCopy.appName.split('');

    // Logo rolls in from a side-on angle, then settles — easeOutBack like AnimatedIllustration.
    final logoRoll = Curves.easeOutBack.transform(
      (progress / 0.4).clamp(0.0, 1.0),
    );
    final rollAngle = (1 - logoRoll) * -math.pi * 0.6;

    // Gentle exit fade once typing completes.
    final exit = Curves.easeInCubic.transform(
      ((progress - 0.9) / 0.1).clamp(0.0, 1.0),
    );
    final masterOpacity = (1 - exit).clamp(0.0, 1.0);

    return Opacity(
      opacity: masterOpacity,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Transform(
            alignment: Alignment.center,
            transform: Matrix4.identity()
              ..setEntry(3, 2, 0.002)
              ..rotateY(rollAngle),
            child: Transform.scale(
              scale: 0.5 + 0.5 * logoRoll,
              child: Opacity(
                opacity: logoRoll.clamp(0.0, 1.0),
                child: Image.asset(
                  AppAssets.logo,
                  width: 108,
                  height: 108,
                  fit: BoxFit.contain,
                  filterQuality: FilterQuality.high,
                ),
              ),
            ),
          ),
          const SizedBox(height: 20),
          Row(
            mainAxisSize: MainAxisSize.min,
            children: List.generate(letters.length, (i) {
              // Each letter pops in sequentially — stagger like login form fields.
              final start = 0.34 + i * 0.09;
              final letterT = Curves.easeOutBack.transform(
                ((progress - start) / 0.16).clamp(0.0, 1.0),
              );
              return Opacity(
                opacity: letterT.clamp(0.0, 1.0),
                child: Transform.scale(
                  scale: 0.55 + 0.45 * letterT,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 2),
                    child: Text(
                      letters[i],
                      style: TextStyle(
                        fontSize: 46,
                        fontWeight: FontWeight.w900,
                        letterSpacing: -1,
                        color: AppColors.primaryDark,
                      ),
                    ),
                  ),
                ),
              );
            }),
          ),
        ],
      ),
    );
  }
}
