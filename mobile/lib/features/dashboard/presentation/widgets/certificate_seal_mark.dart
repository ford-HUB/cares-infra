import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../../data/certificate_service.dart';
import '../../data/models/certificate_design.dart';
import '../utils/certificate_palette.dart';

/// The seal: the director's uploaded SVG when there is one, otherwise the
/// pre-built mark they picked — stamp, starburst, rosette, laurel, ribbon or
/// monogram — in the seal's accent, sized off the seal block.
class CertificateSealMark extends StatelessWidget {
  const CertificateSealMark({
    super.key,
    required this.design,
    required this.diameter,
    required this.labelStyle,
  });

  final CertificateDesign design;
  final double diameter;
  final TextStyle labelStyle;

  @override
  Widget build(BuildContext context) {
    final tone = certificatePalette(design.resolvedSealAccent);
    final style = design.resolvedSealStyle;
    final label = design.sealLabel.trim();

    final labelText = label.isEmpty
        ? null
        : Text(
            label.toUpperCase(),
            textAlign: TextAlign.center,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: labelStyle.copyWith(
              color: tone.sealInk,
              letterSpacing: labelStyle.fontSize == null
                  ? null
                  : labelStyle.fontSize! * 0.08,
              height: 1,
            ),
          );

    if (design.sealSvgUrl != null) {
      final service = CertificateService();
      return SizedBox(
        width: diameter,
        height: diameter,
        child: Stack(
          alignment: Alignment.center,
          children: [
            SvgPicture.network(
              service.imageUrl(design.sealSvgUrl!),
              headers: service.imageHeaders,
              fit: BoxFit.contain,
              width: diameter,
              height: diameter,
            ),
            if (labelText != null)
              Positioned(
                left: 0,
                right: 0,
                bottom: diameter * 0.12,
                child: labelText,
              ),
          ],
        ),
      );
    }

    if (style == 'stamp') {
      return Container(
        width: diameter,
        height: diameter,
        decoration: BoxDecoration(color: tone.sealFill, shape: BoxShape.circle),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.approval_rounded,
              size: diameter * 0.3,
              color: tone.sealInk,
            ),
            if (labelText != null) ...[
              SizedBox(height: diameter * 0.04),
              Padding(
                padding: EdgeInsets.symmetric(horizontal: diameter * 0.06),
                child: labelText,
              ),
            ],
          ],
        ),
      );
    }

    return SizedBox(
      width: diameter,
      height: diameter,
      child: Stack(
        alignment: Alignment.center,
        children: [
          CustomPaint(
            size: Size(diameter, diameter),
            painter: _SealPainter(style, tone.sealInk),
          ),
          if (labelText != null)
            Padding(
              padding: EdgeInsets.only(
                left: diameter * 0.06,
                right: diameter * 0.06,
                top: style == 'ribbon' ? diameter * 0.16 : 0,
              ),
              child: labelText,
            ),
        ],
      ),
    );
  }
}

/// The portal's seal SVGs, redrawn in a 100×100 box scaled to the seal.
class _SealPainter extends CustomPainter {
  _SealPainter(this.style, this.ink);

  final String style;
  final Color ink;

  @override
  void paint(Canvas canvas, Size size) {
    final s = size.width / 100;
    canvas.scale(s, s);
    final stroke = Paint()
      ..style = PaintingStyle.stroke
      ..color = ink
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;
    final fill = Paint()..style = PaintingStyle.fill;

    switch (style) {
      case 'starburst':
        final star = _starPath(24, 48, 40);
        canvas.drawPath(star, fill..color = ink.withValues(alpha: 0.18));
        canvas.drawPath(star, stroke..strokeWidth = 1.5);
        canvas.drawCircle(const Offset(50, 50), 33, stroke..strokeWidth = 2);
      case 'rosette':
        canvas.drawPath(
          Path()
            ..moveTo(38, 74)
            ..lineTo(30, 98)
            ..lineTo(44, 91)
            ..lineTo(50, 100)
            ..lineTo(56, 91)
            ..lineTo(70, 98)
            ..lineTo(62, 74)
            ..close(),
          fill..color = ink.withValues(alpha: 0.35),
        );
        for (var i = 0; i < 14; i++) {
          final angle = math.pi * 2 * i / 14 - math.pi / 2;
          canvas.drawCircle(
            Offset(50 + 38 * math.cos(angle), 50 + 38 * math.sin(angle)),
            9,
            fill..color = ink.withValues(alpha: 0.22),
          );
        }
        canvas.drawCircle(
          const Offset(50, 50),
          34,
          fill..color = ink.withValues(alpha: 0.14),
        );
        canvas.drawCircle(const Offset(50, 50), 34, stroke..strokeWidth = 2);
      case 'laurel':
        canvas.drawPath(
          Path()
            ..moveTo(50, 92)
            ..cubicTo(24, 84, 14, 62, 20, 36),
          stroke..strokeWidth = 3,
        );
        canvas.drawPath(
          Path()
            ..moveTo(50, 92)
            ..cubicTo(76, 84, 86, 62, 80, 36),
          stroke..strokeWidth = 3,
        );
        for (var i = 0; i < 5; i++) {
          final y = 78.0 - i * 12;
          _leaf(
            canvas,
            Offset(22.0 + i * 5, y),
            -50 + i * 12.0,
            fill..color = ink.withValues(alpha: 0.55),
          );
          _leaf(
            canvas,
            Offset(78.0 - i * 5, y),
            50 - i * 12.0,
            fill..color = ink.withValues(alpha: 0.55),
          );
        }
      case 'ribbon':
        canvas.drawCircle(
          const Offset(50, 44),
          34,
          fill..color = ink.withValues(alpha: 0.14),
        );
        canvas.drawCircle(const Offset(50, 44), 34, stroke..strokeWidth = 2);
        canvas.drawPath(
          Path()
            ..moveTo(8, 62)
            ..lineTo(92, 62)
            ..lineTo(84, 78)
            ..lineTo(16, 78)
            ..close(),
          fill..color = ink.withValues(alpha: 0.85),
        );
        canvas.drawPath(
          Path()
            ..moveTo(8, 62)
            ..lineTo(2, 70)
            ..lineTo(8, 78)
            ..close(),
          fill..color = ink.withValues(alpha: 0.5),
        );
        canvas.drawPath(
          Path()
            ..moveTo(92, 62)
            ..lineTo(98, 70)
            ..lineTo(92, 78)
            ..close(),
          fill..color = ink.withValues(alpha: 0.5),
        );
      case 'monogram':
        canvas.drawCircle(const Offset(50, 50), 46, stroke..strokeWidth = 1.5);
        final dashed = Path()
          ..addOval(Rect.fromCircle(center: const Offset(50, 50), radius: 38));
        for (final metric in dashed.computeMetrics()) {
          var d = 0.0;
          while (d < metric.length) {
            final next = math.min(d + 2, metric.length);
            canvas.drawPath(
              metric.extractPath(d, next),
              stroke..strokeWidth = 1,
            );
            d = next + 3;
          }
        }
      default:
        break;
    }
  }

  Path _starPath(int points, double outer, double inner) {
    final path = Path();
    for (var i = 0; i < points * 2; i++) {
      final radius = i.isEven ? outer : inner;
      final angle = math.pi * i / points - math.pi / 2;
      final point = Offset(
        50 + radius * math.cos(angle),
        50 + radius * math.sin(angle),
      );
      if (i == 0) {
        path.moveTo(point.dx, point.dy);
      } else {
        path.lineTo(point.dx, point.dy);
      }
    }
    return path..close();
  }

  void _leaf(Canvas canvas, Offset center, double degrees, Paint paint) {
    canvas.save();
    canvas.translate(center.dx, center.dy);
    canvas.rotate(degrees * math.pi / 180);
    canvas.drawOval(
      Rect.fromCenter(center: Offset.zero, width: 14, height: 8),
      paint,
    );
    canvas.restore();
  }

  @override
  bool shouldRepaint(_SealPainter old) => old.style != style || old.ink != ink;
}
