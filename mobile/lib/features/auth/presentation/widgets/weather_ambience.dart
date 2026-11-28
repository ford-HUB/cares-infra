import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:mobile/core/models/sun_weather_mood.dart';

/// Scenery behind the temperature: wind on a dry day, rain on a wet one.
class WeatherAmbience extends StatefulWidget {
  const WeatherAmbience({
    super.key,
    required this.size,
    required this.mood,
    this.progress = 1.0,
    this.discomfort = 0.0,
  });

  final Size size;
  final SunWeatherMood mood;

  final double progress;

  /// 0 = calm, 1 = harsh. Drives how many gusts blow and how hard it rains.
  final double discomfort;

  @override
  State<WeatherAmbience> createState() => _WeatherAmbienceState();
}

class _WeatherAmbienceState extends State<WeatherAmbience>
    with SingleTickerProviderStateMixin {
  late final AnimationController _loop;

  @override
  void initState() {
    super.initState();
    _loop = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 6),
    )..repeat();
  }

  @override
  void dispose() {
    _loop.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final fadeIn = Curves.easeOut.transform(widget.progress.clamp(0.0, 1.0));

    return Opacity(
      opacity: fadeIn,
      child: SizedBox.fromSize(
        size: widget.size,
        child: AnimatedBuilder(
          animation: _loop,
          builder: (context, _) {
            return CustomPaint(
              painter: _WeatherAmbiencePainter(
                phase: _loop.value,
                mood: widget.mood,
                discomfort: widget.discomfort,
              ),
            );
          },
        ),
      ),
    );
  }
}

/// Fractions of the canvas size; `speed` must be whole loops per cycle so the
/// drift doesn't jump on wrap.
typedef _Gust = ({
  double y,
  double length,
  double width,
  double alpha,
  int speed,
  double offset,
});

class _WeatherAmbiencePainter extends CustomPainter {
  _WeatherAmbiencePainter({
    required this.phase,
    required this.mood,
    required this.discomfort,
  });

  final double phase;
  final SunWeatherMood mood;
  final double discomfort;

  static const _windColor = Color(0xFFFFFFFF);
  static const _rainColor = Color(0xFFCFEBFF);

  static const _gusts = <_Gust>[
    (y: 0.22, length: 0.52, width: 0.045, alpha: 0.55, speed: 1, offset: 0.0),
    (y: 0.42, length: 0.68, width: 0.06, alpha: 0.7, speed: 1, offset: 0.38),
    (y: 0.62, length: 0.4, width: 0.035, alpha: 0.4, speed: 2, offset: 0.15),
    (y: 0.78, length: 0.58, width: 0.04, alpha: 0.45, speed: 1, offset: 0.7),
    (y: 0.32, length: 0.34, width: 0.03, alpha: 0.3, speed: 2, offset: 0.55),
  ];

  static const _smoke = <_Gust>[
    (y: 0.3, length: 0.95, width: 0.34, alpha: 0.13, speed: 1, offset: 0.12),
    (y: 0.58, length: 1.1, width: 0.42, alpha: 0.11, speed: 1, offset: 0.62),
  ];

  @override
  void paint(Canvas canvas, Size size) {
    for (final trail in _smoke) {
      _drawStreak(canvas, size, trail, soft: true);
    }

    // Rain still gets a little wind behind it; a dry sky gets the full set.
    final gustCount = mood == SunWeatherMood.rainy ? 2 : _gusts.length;
    for (var i = 0; i < gustCount; i++) {
      _drawStreak(canvas, size, _gusts[i], soft: false);
    }

    if (mood == SunWeatherMood.rainy) {
      _drawRain(canvas, size);
    }
  }

  /// Fades along its length and across its run, so the ends dissolve and it
  /// eases in and out.
  void _drawStreak(Canvas canvas, Size size, _Gust gust, {required bool soft}) {
    final length = size.width * gust.length;
    final travel = size.width + length * 2;
    final t = (phase * gust.speed + gust.offset) % 1.0;
    final x = -length + t * travel;
    final y = size.height * gust.y;

    final runFade = math.sin(t * math.pi).clamp(0.0, 1.0);
    final alpha = gust.alpha * (0.7 + discomfort * 0.3) * runFade;
    if (alpha <= 0.01) return;

    final start = Offset(x, y);
    final end = Offset(x + length, y);
    final width = size.height * gust.width;

    void stroke(double widthScale, double alphaScale, double blur) {
      final color = _windColor.withValues(alpha: alpha * alphaScale);
      final paint = Paint()
        ..style = PaintingStyle.stroke
        ..strokeCap = StrokeCap.butt
        ..strokeWidth = width * widthScale
        ..shader = ui.Gradient.linear(
          start,
          end,
          [
            _windColor.withValues(alpha: 0),
            color,
            color,
            _windColor.withValues(alpha: 0),
          ],
          const [0.0, 0.3, 0.7, 1.0],
        );
      if (blur > 0) {
        paint.maskFilter = MaskFilter.blur(BlurStyle.normal, blur);
      }
      canvas.drawLine(start, end, paint);
    }

    if (soft) {
      stroke(1.0, 1.0, width * 0.5);
      return;
    }

    stroke(2.6, 0.22, width * 1.2);
    stroke(1.0, 0.9, width * 0.15);
  }

  void _drawRain(Canvas canvas, Size size) {
    final dropCount = 16 + (discomfort * 10).round();
    final slant = size.height * 0.16;

    for (var i = 0; i < dropCount; i++) {
      final lane = (i * 0.618) % 1.0; // golden-ratio spacing: no visible rows
      final x = lane * size.width;
      final cycle = (phase * 3 + i * 0.137) % 1.0;
      final y = -size.height * 0.15 + cycle * size.height * 1.3;
      final len = size.height * (0.14 + (i % 3) * 0.04);
      final alpha = 0.75 * math.sin(cycle * math.pi).clamp(0.0, 1.0);

      canvas.drawLine(
        Offset(x, y),
        Offset(x - slant * (len / size.height) * 2, y + len),
        Paint()
          ..strokeCap = StrokeCap.round
          ..strokeWidth = size.height * 0.022
          ..color = _rainColor.withValues(alpha: alpha),
      );
    }
  }

  @override
  bool shouldRepaint(_WeatherAmbiencePainter oldDelegate) =>
      oldDelegate.phase != phase ||
      oldDelegate.mood != mood ||
      oldDelegate.discomfort != discomfort;
}
