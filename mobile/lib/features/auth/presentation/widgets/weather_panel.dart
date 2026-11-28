import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/core/models/sun_weather_mood.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/auth/presentation/providers/weather_provider.dart';
import 'package:mobile/features/auth/presentation/widgets/dot_matrix_text.dart';
import 'package:mobile/features/auth/presentation/widgets/weather_ambience.dart';

class WeatherPanel extends ConsumerWidget {
  const WeatherPanel({super.key, required this.width, required this.progress});

  final double width;
  final double progress;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final snapshot = ref.watch(weatherProvider).valueOrNull;
    final mood = snapshot?.mood ?? SunWeatherMood.clear;
    final tempLabel = snapshot?.tempLabel ?? '--°C';
    final discomfort = weatherDiscomfortFromTemp(
      snapshot?.tempCelsius ?? 28,
      mood,
    );
    final size = Size(width, width * 0.46);

    return SizedBox.fromSize(
      size: size,
      child: Stack(
        alignment: Alignment.center,
        children: [
          Positioned.fill(
            child: WeatherAmbience(
              size: size,
              mood: mood,
              progress: progress,
              discomfort: discomfort,
            ),
          ),
          // Scale down rather than overflow on narrow panels.
          FittedBox(
            fit: BoxFit.scaleDown,
            child: _TemperaturePill(label: tempLabel, mood: mood),
          ),
        ],
      ),
    );
  }
}

/// A radial wash instead of a bordered chip, so gusts blow through and only the
/// numerals stay hard.
class _TemperaturePill extends StatelessWidget {
  const _TemperaturePill({required this.label, required this.mood});

  final String label;
  final SunWeatherMood mood;

  IconData get _moodIcon => switch (mood) {
    SunWeatherMood.clear => Icons.wb_sunny_rounded,
    SunWeatherMood.cloudy => Icons.air_rounded,
    SunWeatherMood.rainy => Icons.water_drop_rounded,
  };

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(22, 14, 24, 14),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(999),
        gradient: RadialGradient(
          radius: 0.8,
          colors: [
            AppColors.primaryDark.withValues(alpha: 0.62),
            AppColors.primaryDark.withValues(alpha: 0.34),
            AppColors.primaryDark.withValues(alpha: 0.0),
          ],
          stops: const [0.0, 0.6, 1.0],
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Icon(
            _moodIcon,
            size: 15,
            color: Colors.white.withValues(alpha: 0.92),
            shadows: const [Shadow(color: Color(0xB31F5F28), blurRadius: 6)],
          ),
          const SizedBox(width: 8),
          DotMatrixText(
            text: label,
            color: Colors.white,
            glowColor: const Color(0xCC1F5F28),
            dotSize: 3.0,
            gap: 1.2,
            charGap: 2.2,
          ),
        ],
      ),
    );
  }
}
