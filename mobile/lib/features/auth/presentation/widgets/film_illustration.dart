import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme.dart';

/// Cinematic hero illustration — volunteer character, organic blob, floating
/// CARES program icons (extension, eco, literacy, care).
class FilmIllustration extends StatelessWidget {
  const FilmIllustration({
    super.key,
    required this.progress,
    this.width = 320,
    this.height = 340,
  });

  final double progress;
  final double width;
  final double height;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: width,
      height: height,
      child: CustomPaint(
        painter: _FilmPainter(progress: progress),
        size: Size(width, height),
      ),
    );
  }
}

class _FilmPainter extends CustomPainter {
  _FilmPainter({required this.progress});

  final double progress;

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height * 0.52);

    _drawBlob(canvas, center, size);
    _drawGroundShadow(canvas, center, size);
    _drawVolunteer(canvas, center, size);
    _drawFloatingIcons(canvas, center, size);
    _drawConnectorDots(canvas, center, size);
  }

  void _drawBlob(Canvas canvas, Offset center, Size size) {
    final blobIn = Curves.easeOutBack.transform(
      (progress / 0.35).clamp(0.0, 1.0),
    );
    if (blobIn <= 0) return;

    final wobble = math.sin(progress * math.pi * 3) * 6;
    final blob = Path();
    final cx = center.dx;
    final cy = center.dy - 20 + wobble * 0.3;
    final rw = size.width * 0.42 * blobIn;
    final rh = size.height * 0.38 * blobIn;

    blob.moveTo(cx - rw * 0.9, cy);
    blob.cubicTo(cx - rw, cy - rh, cx - rw * 0.3, cy - rh * 1.1, cx, cy - rh);
    blob.cubicTo(cx + rw * 0.35, cy - rh * 1.05, cx + rw, cy - rh * 0.7, cx + rw * 0.95, cy);
    blob.cubicTo(cx + rw * 1.05, cy + rh * 0.4, cx + rw * 0.4, cy + rh * 0.85, cx, cy + rh * 0.75);
    blob.cubicTo(cx - rw * 0.45, cy + rh * 0.9, cx - rw, cy + rh * 0.35, cx - rw * 0.9, cy);

    canvas.drawShadow(blob, AppColors.primary.withValues(alpha: 0.25), 18, false);
    canvas.drawPath(
      blob,
      Paint()
        ..shader = ui.Gradient.linear(
          Offset(cx - rw, cy - rh),
          Offset(cx + rw, cy + rh),
          [
            AppColors.secondary.withValues(alpha: 0.95),
            AppColors.primary.withValues(alpha: 0.88),
          ],
        ),
    );
  }

  void _drawGroundShadow(Canvas canvas, Offset center, Size size) {
    final shadowIn = Curves.easeOut.transform(
      ((progress - 0.15) / 0.4).clamp(0.0, 1.0),
    );
    if (shadowIn <= 0) return;
    canvas.drawOval(
      Rect.fromCenter(
        center: center + Offset(0, size.height * 0.22),
        width: size.width * 0.5 * shadowIn,
        height: 14,
      ),
      Paint()..color = AppColors.primary.withValues(alpha: 0.12),
    );
  }

  void _drawVolunteer(Canvas canvas, Offset center, Size size) {
    final enter = Curves.easeOutCubic.transform(
      ((progress - 0.12) / 0.45).clamp(0.0, 1.0),
    );
    if (enter <= 0) return;

    final slideY = (1 - enter) * 80;
    final base = center + Offset(0, slideY);
    final s = size.width / 320;

    final stroke = Paint()
      ..color = const Color(0xFF1B1B1B)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.8 * s
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;

    final fillSkin = Paint()..color = const Color(0xFFFFD5B8);
    final fillShirt = Paint()..color = AppColors.primary;
    final fillPants = Paint()..color = const Color(0xFF81D4FA);
    final fillShoes = Paint()..color = const Color(0xFF263238);

    // Legs
    canvas.drawLine(base + Offset(-14 * s, 50 * s), base + Offset(-14 * s, 95 * s), stroke);
    canvas.drawLine(base + Offset(14 * s, 50 * s), base + Offset(14 * s, 95 * s), stroke);
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromCenter(center: base + Offset(-14 * s, 102 * s), width: 28 * s, height: 12 * s),
        Radius.circular(6 * s),
      ),
      fillShoes,
    );
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromCenter(center: base + Offset(14 * s, 102 * s), width: 28 * s, height: 12 * s),
        Radius.circular(6 * s),
      ),
      fillShoes,
    );

    // Pants
    canvas.drawPath(
      Path()
        ..moveTo(base.dx - 18 * s, base.dy + 48 * s)
        ..lineTo(base.dx + 18 * s, base.dy + 48 * s)
        ..lineTo(base.dx + 22 * s, base.dy + 58 * s)
        ..lineTo(base.dx - 22 * s, base.dy + 58 * s)
        ..close(),
      fillPants,
    );

    // Torso / CARES shirt
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromCenter(center: base + Offset(0, 18 * s), width: 56 * s, height: 62 * s),
        Radius.circular(14 * s),
      ),
      fillShirt,
    );
    final caresText = TextPainter(
      text: TextSpan(
        text: 'CARES',
        style: TextStyle(
          color: Colors.white.withValues(alpha: 0.9),
          fontSize: 11 * s,
          fontWeight: FontWeight.w800,
          letterSpacing: 1,
        ),
      ),
      textDirection: TextDirection.ltr,
    )..layout();
    caresText.paint(canvas, base + Offset(-caresText.width / 2, 8 * s));

    // Arms — one holds sapling, one waves
    final wave = math.sin(progress * math.pi * 6) * 0.08;
    canvas.drawLine(
      base + Offset(-28 * s, 8 * s),
      base + Offset(-48 * s, -8 * s + wave * 20),
      stroke,
    );
    canvas.drawLine(
      base + Offset(28 * s, 8 * s),
      base + Offset(52 * s, 20 * s),
      stroke,
    );

    // Sapling in hand
    final sprout = Curves.easeOut.transform(((progress - 0.35) / 0.4).clamp(0.0, 1.0));
    if (sprout > 0) {
      final hand = base + Offset(52 * s, 20 * s);
      canvas.drawLine(
        hand,
        hand + Offset(0, -22 * s * sprout),
        Paint()
          ..color = AppColors.secondary
          ..strokeWidth = 3 * s
          ..strokeCap = StrokeCap.round,
      );
      canvas.drawCircle(hand + Offset(0, -26 * s * sprout), 5 * s, Paint()..color = AppColors.secondary);
    }

    // Head
    canvas.drawCircle(base + Offset(0, -28 * s), 22 * s, fillSkin);
    canvas.drawCircle(base + Offset(0, -28 * s), 22 * s, stroke..style = PaintingStyle.stroke);

    // Hair
    canvas.drawPath(
      Path()
        ..moveTo(base.dx - 20 * s, base.dy - 38 * s)
        ..quadraticBezierTo(base.dx, base.dy - 58 * s, base.dx + 20 * s, base.dy - 38 * s)
        ..lineTo(base.dx + 18 * s, base.dy - 30 * s)
        ..quadraticBezierTo(base.dx, base.dy - 48 * s, base.dx - 18 * s, base.dy - 30 * s)
        ..close(),
      Paint()..color = const Color(0xFF212121),
    );

    // Glasses
    canvas.drawOval(
      Rect.fromCenter(center: base + Offset(-9 * s, -30 * s), width: 14 * s, height: 10 * s),
      stroke..strokeWidth = 2 * s,
    );
    canvas.drawOval(
      Rect.fromCenter(center: base + Offset(9 * s, -30 * s), width: 14 * s, height: 10 * s),
      stroke..strokeWidth = 2 * s,
    );
    canvas.drawLine(base + Offset(-2 * s, -30 * s), base + Offset(2 * s, -30 * s), stroke..strokeWidth = 2 * s);

    // Smile
    canvas.drawArc(
      Rect.fromCenter(center: base + Offset(0, -22 * s), width: 12 * s, height: 8 * s),
      0.1,
      math.pi - 0.2,
      false,
      stroke..strokeWidth = 2 * s,
    );
  }

  void _drawFloatingIcons(Canvas canvas, Offset center, Size size) {
    final icons = <_FilmIcon>[
      _FilmIcon(
        delay: 0.28,
        angle: -2.1,
        dist: 0.52,
        icon: Icons.groups_rounded,
        color: AppColors.communityRing[0],
      ),
      _FilmIcon(
        delay: 0.36,
        angle: -0.8,
        dist: 0.58,
        icon: Icons.eco_rounded,
        color: AppColors.secondary,
      ),
      _FilmIcon(
        delay: 0.44,
        angle: 0.5,
        dist: 0.55,
        icon: Icons.menu_book_rounded,
        color: AppColors.accent,
      ),
      _FilmIcon(
        delay: 0.52,
        angle: 1.8,
        dist: 0.5,
        icon: Icons.favorite_rounded,
        color: AppColors.heart,
      ),
      _FilmIcon(
        delay: 0.6,
        angle: 2.6,
        dist: 0.54,
        icon: Icons.recycling_rounded,
        color: const Color(0xFF26A69A),
      ),
    ];

    for (final item in icons) {
      final inT = Curves.elasticOut.transform(
        ((progress - item.delay) / 0.35).clamp(0.0, 1.0),
      );
      if (inT <= 0) continue;

      final bob = math.sin(progress * math.pi * 4 + item.angle) * 8;
      final orbit = progress * 0.15;
      final angle = item.angle + orbit;
      final radius = size.width * item.dist * 0.5;
      final pos = center +
          Offset(math.cos(angle), math.sin(angle)) * radius * inT +
          Offset(0, bob);

      final badgeR = 26.0 * inT;
      canvas.drawCircle(
        pos,
        badgeR,
        Paint()
          ..color = Colors.white
          ..style = PaintingStyle.fill,
      );
      canvas.drawCircle(
        pos,
        badgeR,
        Paint()
          ..color = item.color.withValues(alpha: 0.35)
          ..style = PaintingStyle.stroke
          ..strokeWidth = 2,
      );

      _paintIcon(canvas, item.icon, pos, item.color, 22 * inT);
    }
  }

  void _paintIcon(Canvas canvas, IconData icon, Offset pos, Color color, double iconSize) {
    final tp = TextPainter(
      text: TextSpan(
        text: String.fromCharCode(icon.codePoint),
        style: TextStyle(
          fontFamily: icon.fontFamily,
          package: icon.fontPackage,
          fontSize: iconSize,
          color: color,
        ),
      ),
      textDirection: TextDirection.ltr,
    )..layout();
    tp.paint(canvas, pos - Offset(tp.width / 2, tp.height / 2));
  }

  void _drawConnectorDots(Canvas canvas, Offset center, Size size) {
    final dotIn = Curves.easeOut.transform(
      ((progress - 0.4) / 0.5).clamp(0.0, 1.0),
    );
    if (dotIn <= 0) return;

    final dotPaint = Paint()
      ..color = AppColors.light.withValues(alpha: 0.7 * dotIn)
      ..style = PaintingStyle.fill;

    for (var i = 0; i < 14; i++) {
      final t = i / 13;
      final angle = -1.2 + t * 2.8 + progress * 0.2;
      final r = size.width * (0.28 + t * 0.22);
      final pos = center + Offset(math.cos(angle), math.sin(angle)) * r;
      canvas.drawCircle(pos, 2.5 + (i % 3), dotPaint);
    }
  }

  @override
  bool shouldRepaint(_FilmPainter old) => old.progress != progress;
}

class _FilmIcon {
  const _FilmIcon({
    required this.delay,
    required this.angle,
    required this.dist,
    required this.icon,
    required this.color,
  });

  final double delay;
  final double angle;
  final double dist;
  final IconData icon;
  final Color color;
}
