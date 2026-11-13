import 'dart:math' as math;

import 'package:flutter/material.dart';

import 'package:mobile/core/theme/app_theme.dart';

/// Profile completion drawn as a ring around the header avatar, with the
/// percentage in a pill on the ring's bottom edge. Green while the person is
/// still filling things in; amber while a document waits on an administrator.
///
/// Sits on the deep green [DeepTabHeader] band, so the empty track is a faint
/// white rather than a grey.
class AvatarCompletionRing extends StatelessWidget {
  const AvatarCompletionRing({
    super.key,
    required this.percent,
    required this.child,
    this.underReview = false,
    this.size = 76,
    this.strokeWidth = 3.5,
  });

  /// 0–100; clamped.
  final int percent;

  /// The avatar itself, laid out inside the ring.
  final Widget child;

  /// Paints the arc and pill amber instead of green.
  final bool underReview;

  final double size;

  final double strokeWidth;

  /// Bright enough to read against the deep green band.
  static const Color progressColor = Color(0xFF7BD389);

  static const Color reviewColor = AppColors.warning;

  @override
  Widget build(BuildContext context) {
    final value = percent.clamp(0, 100);
    final color = underReview ? reviewColor : progressColor;

    return Semantics(
      label: underReview
          ? 'Profile $value% complete, document under review'
          : 'Profile $value% complete',
      child: SizedBox(
        width: size,
        height: size,
        child: Stack(
          clipBehavior: Clip.none,
          children: [
            Positioned.fill(
              child: TweenAnimationBuilder<double>(
                tween: Tween(end: value / 100),
                duration: const Duration(milliseconds: 600),
                curve: Curves.easeOutCubic,
                builder: (context, t, _) => CustomPaint(
                  painter: _RingPainter(
                    progress: t,
                    color: color,
                    strokeWidth: strokeWidth,
                  ),
                ),
              ),
            ),
            Positioned.fill(
              child: Padding(
                // Ring stroke plus a hairline of band between ring and photo.
                padding: EdgeInsets.all(strokeWidth + 2.5),
                child: child,
              ),
            ),
            Positioned(
              left: 0,
              right: 0,
              bottom: -6,
              child: Center(
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 7,
                    vertical: 2,
                  ),
                  decoration: ShapeDecoration(
                    color: color,
                    shape: const StadiumBorder(
                      side: BorderSide(
                        color: AppColors.deepHeaderBottom,
                        width: 1.5,
                      ),
                    ),
                  ),
                  child: Text(
                    '$value%',
                    style: const TextStyle(
                      fontSize: 10.5,
                      fontWeight: FontWeight.w800,
                      color: AppColors.darkGreenTop,
                      height: 1.2,
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _RingPainter extends CustomPainter {
  _RingPainter({
    required this.progress,
    required this.color,
    required this.strokeWidth,
  });

  final double progress;
  final Color color;
  final double strokeWidth;

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Rect.fromCircle(
      center: size.center(Offset.zero),
      radius: (size.shortestSide - strokeWidth) / 2,
    );

    canvas.drawArc(
      rect,
      0,
      math.pi * 2,
      false,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = strokeWidth
        ..color = Colors.white.withValues(alpha: 0.22),
    );

    if (progress <= 0) return;

    canvas.drawArc(
      rect,
      -math.pi / 2,
      math.pi * 2 * progress,
      false,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = strokeWidth
        ..strokeCap = StrokeCap.round
        ..color = color,
    );
  }

  @override
  bool shouldRepaint(_RingPainter old) =>
      old.progress != progress ||
      old.color != color ||
      old.strokeWidth != strokeWidth;
}
