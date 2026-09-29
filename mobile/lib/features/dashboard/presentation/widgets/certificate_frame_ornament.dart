import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../utils/certificate_palette.dart';

/// The decoration that makes each preset frame recognisable — inner keyline,
/// curved side panel, corner ribbons, banner corners, header band — drawn
/// with paint rather than artwork so it follows the accent, as the portal
/// does. Sizes are fractions of the sheet width: the portal's pixel values
/// on its 896px preview.
class CertificateFrameOrnament extends StatelessWidget {
  const CertificateFrameOrnament({
    super.key,
    required this.frame,
    required this.accent,
  });

  final String frame;
  final String accent;

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: CustomPaint(
        painter: _OrnamentPainter(frame, certificatePalette(accent)),
        size: Size.infinite,
      ),
    );
  }
}

/// Outer edge of the sheet for a preset frame — border width, style, colour.
BoxBorder certificateSheetBorder(String frame, String accent, double width) {
  final tone = certificatePalette(accent);
  final unit = width / 896;
  return switch (frame) {
    'classic' || 'royal' => Border.all(color: tone.frame, width: 4 * unit),
    'diagonal' || 'modern' => Border.all(color: tone.frame, width: 2 * unit),
    'corners' => Border.all(color: Colors.transparent, width: unit),
    'minimal' => Border.all(color: tone.frame, width: unit),
    _ => Border.all(color: certificateBorderGrey, width: unit),
  };
}

class _OrnamentPainter extends CustomPainter {
  _OrnamentPainter(this.frame, this.tone);

  final String frame;
  final CertificateAccentPalette tone;

  @override
  void paint(Canvas canvas, Size size) {
    final unit = size.width / 896;
    final fill = Paint()..style = PaintingStyle.fill;

    switch (frame) {
      case 'classic':
        _keyline(canvas, size, unit, tone.frame);
      case 'royal':
        final panel = 112 * unit;
        final rrect = RRect.fromRectAndCorners(
          Rect.fromLTWH(-panel, 0, panel * 2, size.height),
          topRight: Radius.elliptical(panel * 1.2, size.height * 0.5),
          bottomRight: Radius.elliptical(panel * 1.2, size.height * 0.5),
        );
        canvas.drawRRect(rrect, fill..color = tone.solid);
        final gilt = RRect.fromRectAndCorners(
          Rect.fromLTWH(-panel, 0, panel * 2 + 8 * unit, size.height),
          topRight: Radius.elliptical(panel * 1.2, size.height * 0.5),
          bottomRight: Radius.elliptical(panel * 1.2, size.height * 0.5),
        );
        canvas.saveLayer(Offset.zero & size, Paint());
        canvas.drawRRect(
          gilt,
          fill..color = certificateGilt.withValues(alpha: 0.7),
        );
        canvas.drawRRect(rrect, fill..color = tone.solid);
        canvas.restore();
        _keyline(canvas, size, unit, certificateGiltLight);
      case 'diagonal':
        _ribbon(canvas, size, unit, topLeft: true);
        _ribbon(canvas, size, unit, topLeft: false);
      case 'corners':
        final t = 96 * unit;
        canvas.drawPath(
          Path()
            ..moveTo(0, 0)
            ..lineTo(t, 0)
            ..lineTo(0, t)
            ..close(),
          fill..color = tone.solid,
        );
        canvas.drawPath(
          Path()
            ..moveTo(size.width, 0)
            ..lineTo(size.width, t)
            ..lineTo(size.width - t, 0)
            ..close(),
          fill..color = tone.solid,
        );
        canvas.drawRect(
          Rect.fromLTWH(0, size.height - 20 * unit, size.width, 20 * unit),
          fill..color = tone.solid,
        );
      case 'modern':
        canvas.drawRect(
          Rect.fromLTWH(0, 0, size.width, 16 * unit),
          fill..color = tone.solid,
        );
      case 'minimal':
        _dashedEdge(canvas, size, unit, tone.frame);
      default:
        break;
    }
  }

  /// The inner rule the classic and royal frames carry (`inset-3 rounded-lg`).
  void _keyline(Canvas canvas, Size size, double unit, Color color) {
    final inset = 12 * unit;
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(
          inset,
          inset,
          size.width - inset * 2,
          size.height - inset * 2,
        ),
        Radius.circular(8 * unit),
      ),
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = unit
        ..color = color,
    );
  }

  /// A 45° band across one corner, with a thinner gilt band beside it.
  void _ribbon(Canvas canvas, Size size, double unit, {required bool topLeft}) {
    final length = 320 * unit;
    final thick = 40 * unit;
    final gilt = 10 * unit;
    final fill = Paint()..style = PaintingStyle.fill;

    canvas.save();
    if (topLeft) {
      canvas.translate(0, 0);
      canvas.rotate(math.pi / 4);
    } else {
      canvas.translate(size.width, size.height);
      canvas.rotate(math.pi / 4);
    }
    // Band centred on the corner, so it reads as a sash across it.
    canvas.drawRect(
      Rect.fromCenter(
        center: Offset(0, topLeft ? 56 * unit : -56 * unit),
        width: length,
        height: thick,
      ),
      fill..color = tone.solid,
    );
    canvas.drawRect(
      Rect.fromCenter(
        center: Offset(0, topLeft ? 84 * unit : -84 * unit),
        width: length,
        height: gilt,
      ),
      fill..color = certificateGilt.withValues(alpha: 0.8),
    );
    canvas.restore();
  }

  void _dashedEdge(Canvas canvas, Size size, double unit, Color color) {
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = unit
      ..color = color;
    final dash = 6 * unit;
    final rect = Rect.fromLTWH(
      unit / 2,
      unit / 2,
      size.width - unit,
      size.height - unit,
    );
    final path = Path()..addRect(rect);
    for (final metric in path.computeMetrics()) {
      var distance = 0.0;
      while (distance < metric.length) {
        final next = math.min(distance + dash, metric.length);
        canvas.drawPath(metric.extractPath(distance, next), paint);
        distance = next + dash;
      }
    }
  }

  @override
  bool shouldRepaint(_OrnamentPainter old) =>
      old.frame != frame || old.tone != tone;
}
