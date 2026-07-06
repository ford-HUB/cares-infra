import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:mobile/core/constants/app_assets.dart';
import 'package:mobile/core/theme/app_theme.dart';

/// Animated community-circle illustration inspired by the UCLM CARES emblem:
/// figures holding hands, heart at center, sprout growing — with orbiting motion.
class AnimatedIllustration extends StatelessWidget {
  const AnimatedIllustration({
    super.key,
    required this.progress,
    this.size = 140,
    this.showLogo = true,
  });

  /// Master animation value in [0, 1].
  final double progress;
  final double size;
  final bool showLogo;

  @override
  Widget build(BuildContext context) {
    final ringOpacity = Curves.easeOut.transform(
      ((progress - 0.05) / 0.25).clamp(0.0, 1.0),
    );
    final logoScale = Curves.elasticOut.transform(
      ((progress - 0.1) / 0.4).clamp(0.0, 1.0),
    );
    final pulse = 1.0 + 0.04 * math.sin(progress * math.pi * 4);

    return SizedBox(
      width: size,
      height: size,
      child: Stack(
        alignment: Alignment.center,
        children: [
          CustomPaint(
            size: Size(size, size),
            painter: _EmblemPainter(
              progress: progress,
              ringOpacity: ringOpacity,
            ),
          ),
          if (showLogo)
            Transform.scale(
              scale: logoScale * pulse,
              child: Opacity(
                opacity: ringOpacity,
                child: SizedBox(
                  width: size * 0.72,
                  height: size * 0.72,
                  child: Image.asset(
                    AppAssets.logo,
                    fit: BoxFit.contain,
                    filterQuality: FilterQuality.high,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _EmblemPainter extends CustomPainter {
  _EmblemPainter({required this.progress, required this.ringOpacity});

  final double progress;
  final double ringOpacity;

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width / 2;

    _drawOuterRing(canvas, center, radius);
    _drawOrbitingCommunity(canvas, center, radius * 0.78);
    _drawHeartAndSprout(canvas, center, radius * 0.22);
    _drawLaurelArcs(canvas, center, radius * 0.92);
  }

  void _drawOuterRing(Canvas canvas, Offset center, double radius) {
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3
      ..color = AppColors.primary.withValues(alpha: 0.35 * ringOpacity);

    final sweep = Curves.easeOutCubic.transform(progress.clamp(0.0, 1.0));
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius - 4),
      -math.pi / 2,
      sweep * math.pi * 2,
      false,
      paint,
    );

    final accent = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2
      ..color = AppColors.accent.withValues(alpha: 0.5 * ringOpacity);
    canvas.drawCircle(center, radius - 8, accent);
  }

  void _drawOrbitingCommunity(Canvas canvas, Offset center, double orbitRadius) {
    const count = 6;
    final rotation = progress * math.pi * 2 * 0.35;
    final figureReveal = Curves.easeOutBack.transform(
      ((progress - 0.15) / 0.45).clamp(0.0, 1.0),
    );

    for (var i = 0; i < count; i++) {
      final angle = rotation + (i * 2 * math.pi / count) - math.pi / 2;
      final pos = center +
          Offset(
            math.cos(angle) * orbitRadius * figureReveal,
            math.sin(angle) * orbitRadius * figureReveal,
          );

      final color = AppColors.communityRing[i % AppColors.communityRing.length];
      _drawStickFigure(canvas, pos, color, 10 * figureReveal);
    }

    final linkPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.5
      ..color = AppColors.light.withValues(alpha: 0.6 * figureReveal);
    for (var i = 0; i < count; i++) {
      final a1 = rotation + (i * 2 * math.pi / count) - math.pi / 2;
      final a2 = rotation + ((i + 1) * 2 * math.pi / count) - math.pi / 2;
      final p1 = center + Offset(math.cos(a1), math.sin(a1)) * orbitRadius * figureReveal;
      final p2 = center + Offset(math.cos(a2), math.sin(a2)) * orbitRadius * figureReveal;
      canvas.drawLine(p1, p2, linkPaint);
    }
  }

  void _drawStickFigure(Canvas canvas, Offset origin, Color color, double scale) {
    if (scale <= 0) return;
    final headR = 3.5 * scale / 10;
    final paint = Paint()
      ..color = color.withValues(alpha: ringOpacity)
      ..style = PaintingStyle.fill;

    canvas.drawCircle(origin + Offset(0, -5 * scale / 10), headR, paint);

    final body = Path()
      ..moveTo(origin.dx, origin.dy - 2 * scale / 10)
      ..lineTo(origin.dx, origin.dy + 4 * scale / 10);
    canvas.drawPath(
      body,
      Paint()
        ..color = color.withValues(alpha: ringOpacity)
        ..strokeWidth = 2
        ..style = PaintingStyle.stroke
        ..strokeCap = StrokeCap.round,
    );

    canvas.drawLine(
      origin + Offset(-4 * scale / 10, 0),
      origin + Offset(4 * scale / 10, 0),
      Paint()
        ..color = color.withValues(alpha: ringOpacity)
        ..strokeWidth = 2
        ..strokeCap = StrokeCap.round,
    );
  }

  void _drawHeartAndSprout(Canvas canvas, Offset center, double baseRadius) {
    final heartScale = Curves.elasticOut.transform(
      ((progress - 0.25) / 0.35).clamp(0.0, 1.0),
    );
    final sproutH = Curves.easeOut.transform(
      ((progress - 0.4) / 0.35).clamp(0.0, 1.0),
    );

    if (heartScale <= 0) return;

    final heartPath = Path();
    final h = baseRadius * heartScale;
    heartPath.moveTo(center.dx, center.dy + h * 0.3);
    heartPath.cubicTo(
      center.dx - h,
      center.dy - h * 0.5,
      center.dx - h * 0.2,
      center.dy - h,
      center.dx,
      center.dy - h * 0.55,
    );
    heartPath.cubicTo(
      center.dx + h * 0.2,
      center.dy - h,
      center.dx + h,
      center.dy - h * 0.5,
      center.dx,
      center.dy + h * 0.3,
    );
    canvas.drawPath(
      heartPath,
      Paint()
        ..color = AppColors.heart.withValues(alpha: 0.85 * ringOpacity)
        ..style = PaintingStyle.fill,
    );

    if (sproutH > 0) {
      final stemBase = center + Offset(0, h * 0.15);
      final stemTop = stemBase - Offset(0, 14 * sproutH);
      canvas.drawLine(
        stemBase,
        stemTop,
        Paint()
          ..color = AppColors.secondary.withValues(alpha: ringOpacity)
          ..strokeWidth = 2.5
          ..strokeCap = StrokeCap.round,
      );
      final leafPaint = Paint()
        ..color = AppColors.secondary.withValues(alpha: ringOpacity)
        ..style = PaintingStyle.fill;
      final leaf = Path()
        ..moveTo(stemTop.dx, stemTop.dy)
        ..quadraticBezierTo(
          stemTop.dx - 8 * sproutH,
          stemTop.dy - 2,
          stemTop.dx - 2,
          stemTop.dy + 4,
        )
        ..close();
      canvas.drawPath(leaf, leafPaint);
      final leafR = Path()
        ..moveTo(stemTop.dx, stemTop.dy)
        ..quadraticBezierTo(
          stemTop.dx + 8 * sproutH,
          stemTop.dy - 2,
          stemTop.dx + 2,
          stemTop.dy + 4,
        )
        ..close();
      canvas.drawPath(leafR, leafPaint);
    }
  }

  void _drawLaurelArcs(Canvas canvas, Offset center, double radius) {
    final laurel = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2
      ..color = AppColors.primary.withValues(alpha: 0.25 * ringOpacity);

    const leafCount = 8;
    const arcSpan = math.pi * 0.55;
    for (var side = -1; side <= 1; side += 2) {
      for (var i = 0; i < leafCount; i++) {
        final t = i / (leafCount - 1);
        final angle = side * (math.pi * 0.25 + arcSpan * t);
        final leafCenter = center + Offset(math.cos(angle), math.sin(angle)) * radius;
        canvas.drawCircle(leafCenter, 2.5, laurel);
      }
    }
  }

  @override
  bool shouldRepaint(_EmblemPainter oldDelegate) =>
      oldDelegate.progress != progress || oldDelegate.ringOpacity != ringOpacity;
}
