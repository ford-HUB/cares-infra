import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:mobile/features/dashboard/data/models/ranking_models.dart';

/// The badge frame drawn around a ranked avatar. Which ornament and colours it
/// wears comes from the [tier] the standing falls into — the same ladder the
/// portal's Customization page edits — so the app and the portal agree on what
/// a Mythic border looks like.
///
/// [child] is the avatar itself and the widget lays out at exactly [size]; the
/// ornament is painted around it and overflows the box by a few pixels on each
/// side without taking layout room, the way a badge should sit over its
/// neighbours. Pass a null [tier] to draw a quiet neutral ring.
class RankTierFrame extends StatelessWidget {
  const RankTierFrame({
    super.key,
    required this.tier,
    required this.size,
    required this.child,
    this.compact = false,
  });

  final RankTier? tier;

  /// Diameter of the avatar inside the frame.
  final double size;
  final Widget child;

  /// Drops the ornaments outside the band — for list rows where they would
  /// collide with the neighbours. The band and its colours stay.
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final resolved = tier;
    final colors = resolved == null
        ? [
            Colors.white.withValues(alpha: 0.35),
            Colors.white.withValues(alpha: 0.15),
          ]
        : [resolved.colorFrom, resolved.colorTo];
    final design = resolved?.frame ?? RankFrameDesign.ring;

    return SizedBox.square(
      dimension: size,
      child: CustomPaint(
        painter: _FramePainter(
          design: design,
          colors: colors,
          avatarRadius: size / 2,
          detailed: !compact,
        ),
        child: child,
      ),
    );
  }
}

class _FramePainter extends CustomPainter {
  const _FramePainter({
    required this.design,
    required this.colors,
    required this.avatarRadius,
    required this.detailed,
  });

  final RankFrameDesign design;
  final List<Color> colors;
  final double avatarRadius;
  final bool detailed;

  @override
  void paint(Canvas canvas, Size size) {
    final center = size.center(Offset.zero);
    final rect = Rect.fromCircle(center: center, radius: size.width / 2 + 8);
    final gradient = LinearGradient(
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
      colors: colors,
    ).createShader(rect);

    final stroke = Paint()
      ..shader = gradient
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.5
      ..strokeCap = StrokeCap.round;
    final fill = Paint()
      ..shader = gradient
      ..style = PaintingStyle.fill;

    // The band hugs the avatar with a hairline of breathing room.
    final bandRadius = avatarRadius + 2.5;

    switch (design) {
      case RankFrameDesign.ring:
        canvas.drawCircle(center, bandRadius, stroke);
      case RankFrameDesign.aurora:
        canvas.drawCircle(center, bandRadius, stroke);
        _spikes(
          canvas,
          center,
          bandRadius,
          fill,
          count: 8,
          length: 5,
          width: 4,
        );
        if (detailed) _gem(canvas, center, bandRadius + 5, fill);
      case RankFrameDesign.laurel:
        canvas.drawCircle(center, bandRadius, stroke..strokeWidth = 1.5);
        _leaves(canvas, center, bandRadius, fill);
      case RankFrameDesign.shield:
        _polygon(canvas, center, bandRadius + 2, 6, stroke);
        if (detailed) {
          _dots(
            canvas,
            center,
            bandRadius + 2,
            fill,
            count: 6,
            radius: 1.6,
            offset: math.pi / 6,
          );
        }
      case RankFrameDesign.orbit:
        _arc(canvas, center, bandRadius, stroke, start: -0.2, sweep: 2.2);
        _arc(
          canvas,
          center,
          bandRadius,
          stroke,
          start: math.pi - 0.2,
          sweep: 2.2,
        );
        _dots(
          canvas,
          center,
          bandRadius,
          fill,
          count: 3,
          radius: 2.2,
          offset: -math.pi / 2,
        );
      case RankFrameDesign.crown:
        canvas.drawCircle(center, bandRadius, stroke);
        if (detailed) _crown(canvas, center, bandRadius, fill);
      case RankFrameDesign.starburst:
        if (detailed) {
          _spikes(
            canvas,
            center,
            bandRadius,
            fill,
            count: 5,
            length: 8,
            width: 6,
            offset: -math.pi / 2,
          );
        }
        canvas.drawCircle(center, bandRadius, stroke);
      case RankFrameDesign.blossom:
        if (detailed) _petals(canvas, center, bandRadius, fill);
        canvas.drawCircle(center, bandRadius, stroke);
      case RankFrameDesign.gear:
        _spikes(
          canvas,
          center,
          bandRadius,
          fill,
          count: 12,
          length: 3.5,
          width: 4,
          squared: true,
        );
        canvas.drawCircle(center, bandRadius, stroke);
      case RankFrameDesign.flame:
        canvas.drawCircle(center, bandRadius, stroke);
        if (detailed) _flames(canvas, center, bandRadius, fill);
      case RankFrameDesign.prism:
        _polygon(
          canvas,
          center,
          bandRadius + 3,
          4,
          stroke,
          rotation: math.pi / 4,
        );
        if (detailed) {
          _dots(
            canvas,
            center,
            bandRadius + 3,
            fill,
            count: 4,
            radius: 2,
            offset: math.pi / 4,
          );
        }
      case RankFrameDesign.halo:
        canvas.drawCircle(center, bandRadius, stroke..strokeWidth = 1.5);
        if (detailed) {
          _arc(
            canvas,
            center,
            bandRadius + 5,
            stroke..strokeWidth = 2.5,
            start: -math.pi * 0.85,
            sweep: math.pi * 0.7,
          );
        }
    }
  }

  void _spikes(
    Canvas canvas,
    Offset c,
    double r,
    Paint paint, {
    required int count,
    required double length,
    required double width,
    double offset = 0,
    bool squared = false,
  }) {
    for (var i = 0; i < count; i++) {
      final angle = offset + i * (2 * math.pi / count);
      final dir = Offset(math.cos(angle), math.sin(angle));
      final normal = Offset(-dir.dy, dir.dx);
      final base = c + dir * (r - 1);
      final tip = c + dir * (r + length);
      final path = Path()
        ..moveTo(
          (base + normal * (width / 2)).dx,
          (base + normal * (width / 2)).dy,
        )
        ..lineTo(
          (base - normal * (width / 2)).dx,
          (base - normal * (width / 2)).dy,
        );
      if (squared) {
        path
          ..lineTo(
            (tip - normal * (width / 2)).dx,
            (tip - normal * (width / 2)).dy,
          )
          ..lineTo(
            (tip + normal * (width / 2)).dx,
            (tip + normal * (width / 2)).dy,
          );
      } else {
        path.lineTo(tip.dx, tip.dy);
      }
      path.close();
      canvas.drawPath(path, paint);
    }
  }

  void _dots(
    Canvas canvas,
    Offset c,
    double r,
    Paint paint, {
    required int count,
    required double radius,
    double offset = 0,
  }) {
    for (var i = 0; i < count; i++) {
      final angle = offset + i * (2 * math.pi / count);
      canvas.drawCircle(
        c + Offset(math.cos(angle), math.sin(angle)) * r,
        radius,
        paint,
      );
    }
  }

  void _arc(
    Canvas canvas,
    Offset c,
    double r,
    Paint paint, {
    required double start,
    required double sweep,
  }) {
    canvas.drawArc(
      Rect.fromCircle(center: c, radius: r),
      start,
      sweep,
      false,
      paint,
    );
  }

  void _polygon(
    Canvas canvas,
    Offset c,
    double r,
    int sides,
    Paint paint, {
    double rotation = 0,
  }) {
    final path = Path();
    for (var i = 0; i < sides; i++) {
      final angle = rotation + i * (2 * math.pi / sides);
      final p = c + Offset(math.cos(angle), math.sin(angle)) * r;
      if (i == 0) {
        path.moveTo(p.dx, p.dy);
      } else {
        path.lineTo(p.dx, p.dy);
      }
    }
    path.close();
    canvas.drawPath(path, paint..strokeJoin = StrokeJoin.round);
  }

  /// A diamond sitting on top of the band.
  void _gem(Canvas canvas, Offset c, double r, Paint paint) {
    final top = c + Offset(0, -r);
    final path = Path()
      ..moveTo(top.dx, top.dy - 4)
      ..lineTo(top.dx + 3.5, top.dy)
      ..lineTo(top.dx, top.dy + 4)
      ..lineTo(top.dx - 3.5, top.dy)
      ..close();
    canvas.drawPath(path, paint);
  }

  /// Leaves stepped along both sides of the band, tips pointing up.
  void _leaves(Canvas canvas, Offset c, double r, Paint paint) {
    const angles = [0.32, 0.72, 1.12, 1.52, 1.92, 2.32];
    for (final side in [-1, 1]) {
      for (final a in angles) {
        final angle = math.pi / 2 + side * a;
        final at = c + Offset(math.cos(angle), math.sin(angle)) * (r + 2);
        canvas.save();
        canvas.translate(at.dx, at.dy);
        canvas.rotate(angle + math.pi / 2);
        canvas.drawOval(
          Rect.fromCenter(center: Offset.zero, width: 3.2, height: 6.5),
          paint,
        );
        canvas.restore();
      }
    }
  }

  void _crown(Canvas canvas, Offset c, double r, Paint paint) {
    final base = c + Offset(0, -r - 1);
    final path = Path()
      ..moveTo(base.dx - 8, base.dy)
      ..lineTo(base.dx - 8, base.dy - 5)
      ..lineTo(base.dx - 4, base.dy - 2)
      ..lineTo(base.dx, base.dy - 7)
      ..lineTo(base.dx + 4, base.dy - 2)
      ..lineTo(base.dx + 8, base.dy - 5)
      ..lineTo(base.dx + 8, base.dy)
      ..close();
    canvas.drawPath(path, paint);
  }

  void _petals(Canvas canvas, Offset c, double r, Paint paint) {
    for (var i = 0; i < 8; i++) {
      final angle = i * (math.pi / 4);
      final at = c + Offset(math.cos(angle), math.sin(angle)) * (r + 3);
      canvas.save();
      canvas.translate(at.dx, at.dy);
      canvas.rotate(angle);
      canvas.drawOval(
        Rect.fromCenter(center: Offset.zero, width: 7, height: 4.5),
        paint,
      );
      canvas.restore();
    }
  }

  /// Three tongues rising off the band, the centre one tallest.
  void _flames(Canvas canvas, Offset c, double r, Paint paint) {
    for (final (dx, h) in [(-7.0, 6.0), (0.0, 9.0), (7.0, 6.0)]) {
      final base = c + Offset(dx, -r + 1);
      final path = Path()
        ..moveTo(base.dx - 3, base.dy)
        ..quadraticBezierTo(
          base.dx - 3.5,
          base.dy - h * 0.6,
          base.dx,
          base.dy - h,
        )
        ..quadraticBezierTo(
          base.dx + 3.5,
          base.dy - h * 0.6,
          base.dx + 3,
          base.dy,
        )
        ..close();
      canvas.drawPath(path, paint);
    }
  }

  @override
  bool shouldRepaint(_FramePainter old) =>
      old.design != design ||
      old.colors != colors ||
      old.avatarRadius != avatarRadius ||
      old.detailed != detailed;
}
