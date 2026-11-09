import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme.dart';

enum _WaveStyle { heroEdge, footer }

/// The flowing green wave from the login reference.
///
/// * [BrandWave.heroEdge] closes the bottom of a photo hero: a soft white wash,
///   a lime crest, then the page's white ground sweeping up to the right.
/// * [BrandWave.footer] anchors the bottom of a white page with layered green
///   bands rising the same way.
///
/// Both are pure paint — place them with `Positioned` behind content.
class BrandWave extends StatelessWidget {
  const BrandWave.heroEdge({
    super.key,
    this.height = 72,
    this.ground = Colors.white,
  }) : _style = _WaveStyle.heroEdge;

  const BrandWave.footer({
    super.key,
    this.height = 92,
    this.ground = Colors.white,
  }) : _style = _WaveStyle.footer;

  final double height;

  /// Page colour the hero edge melts into (ignored by the footer).
  final Color ground;
  final _WaveStyle _style;

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: SizedBox(
        height: height,
        width: double.infinity,
        child: CustomPaint(painter: _BrandWavePainter(_style, ground)),
      ),
    );
  }
}

class _BrandWavePainter extends CustomPainter {
  const _BrandWavePainter(this.style, this.ground);

  final _WaveStyle style;
  final Color ground;

  /// A wave that dips a little at the left third, then climbs to the right.
  Path _wave(Size size, double left, double dip, double rise, double right) {
    final w = size.width;
    final h = size.height;
    return Path()
      ..moveTo(0, h * left)
      ..cubicTo(w * 0.30, h * dip, w * 0.64, h * rise, w, h * right)
      ..lineTo(w, h)
      ..lineTo(0, h)
      ..close();
  }

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    switch (style) {
      case _WaveStyle.heroEdge:
        canvas.drawPath(
          _wave(size, 0.56, 0.84, 0.10, 0.0),
          Paint()..color = Colors.white.withValues(alpha: 0.16),
        );
        canvas.drawPath(
          _wave(size, 0.68, 0.96, 0.28, 0.12),
          Paint()
            ..shader = const LinearGradient(
              colors: [AppColors.secondary, AppColors.waveHighlight],
            ).createShader(rect),
        );
        canvas.drawPath(
          _wave(size, 0.78, 1.04, 0.46, 0.32),
          Paint()..color = ground,
        );
      case _WaveStyle.footer:
        canvas.drawPath(
          _wave(size, 0.40, 0.06, 0.78, 0.18),
          Paint()
            ..shader = LinearGradient(
              colors: [
                AppColors.secondary.withValues(alpha: 0.55),
                AppColors.waveHighlight.withValues(alpha: 0.75),
              ],
            ).createShader(rect),
        );
        final front = _wave(size, 0.62, 0.34, 0.98, 0.44);
        canvas.drawPath(
          front,
          Paint()
            ..shader = const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [AppColors.primary, AppColors.primaryDark],
            ).createShader(rect),
        );
        // Thin white crest line along the front band's top edge.
        final w = size.width;
        final h = size.height;
        canvas.drawPath(
          Path()
            ..moveTo(0, h * 0.62)
            ..cubicTo(w * 0.30, h * 0.34, w * 0.64, h * 0.98, w, h * 0.44),
          Paint()
            ..style = PaintingStyle.stroke
            ..strokeWidth = 1.6
            ..color = Colors.white.withValues(alpha: 0.75),
        );
    }
  }

  @override
  bool shouldRepaint(_BrandWavePainter old) =>
      old.style != style || old.ground != ground;
}
