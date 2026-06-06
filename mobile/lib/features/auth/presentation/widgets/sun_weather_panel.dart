import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/core/models/sun_weather_mood.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/auth/presentation/providers/weather_provider.dart';
import 'package:mobile/features/auth/presentation/widgets/kawaii_sun.dart';

/// Top-right sun with OpenWeather temperature centered below the sun disc.
class SunWeatherPanel extends ConsumerWidget {
  const SunWeatherPanel({
    super.key,
    required this.size,
    required this.passwordVisible,
    required this.progress,
    required this.ambient,
  });

  final double size;
  final bool passwordVisible;
  final double progress;
  final double ambient;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final weatherAsync = ref.watch(weatherProvider);
    final snapshot = weatherAsync.valueOrNull;
    final mood = snapshot?.mood ?? SunWeatherMood.clear;
    final tempLabel = snapshot?.tempLabel ?? '--°C';
    final canvasSize = kawaiiSunCanvasSize(mood, size);
    final sunCenterX = kawaiiSunDiscCenterX(mood, size);
    final tempAlignX = (sunCenterX / canvasSize.width) * 2 - 1;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        KawaiiSun(
          size: size,
          passwordVisible: passwordVisible,
          progress: progress,
          ambient: ambient,
          weatherMood: mood,
        ),
        const SizedBox(height: 6),
        SizedBox(
          width: canvasSize.width,
          child: Align(
            alignment: Alignment(tempAlignX, 0),
            child: Text(
              tempLabel,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: AppColors.secondary.withValues(alpha: 0.95),
                shadows: const [
                  Shadow(color: Colors.white70, blurRadius: 4),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}
