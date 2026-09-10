import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:mobile/core/constants/app_copy.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/auth/presentation/widgets/dot_matrix_text.dart';

/// Splash intro — white type on the brand green, with a light wind moving
/// behind it. No emblem: the seal carries its own ring of text, which at any
/// readable size collided with the wordmark sitting on top of it.
///
/// The green field itself belongs to [AppFlow], which collapses it into the
/// login header on exit; this widget only paints what sits on that field.
///
/// Beats:
///   0.06-0.30  lattice pattern fades in
///   0.20-0.58  wordmark letters rise into place
///   0.54-0.70  rule draws out from the centre
///   0.62-0.82  dot-matrix motto fades up beneath
///   0.00-1.00  wind streaks and particles cross behind everything
class AppEntryIntro extends StatelessWidget {
  const AppEntryIntro({super.key, required this.progress});

  /// Master animation value in [0, 1].
  final double progress;

  /// Eased slice of [progress] between [start] and [end].
  static double _seg(
    double progress,
    double start,
    double end, [
    Curve curve = Curves.easeOutCubic,
  ]) {
    if (end <= start) return progress >= end ? 1 : 0;
    return curve.transform(
      ((progress - start) / (end - start)).clamp(0.0, 1.0),
    );
  }

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;

    // Board line sizes itself to the screen so it never wraps or clips.
    final dot = DotMatrixText.dotSizeToFit(
      AppCopy.ringMotto,
      math.min(width - 48, 330.0),
    );

    final ruleT = _seg(progress, 0.54, 0.7);
    final mottoT = _seg(progress, 0.62, 0.82);

    return Stack(
      fit: StackFit.expand,
      children: [
        // Texture, in order of weight: pattern, then wind, then the type.
        CustomPaint(painter: _LatticePatternPainter(progress: progress)),
        CustomPaint(painter: _WindStreakPainter(progress: progress)),
        CustomPaint(painter: _WindParticlePainter(progress: progress)),

        Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              _Wordmark(progress: progress),
              const SizedBox(height: 18),
              // Rule draws outward from the centre, then the motto reads.
              SizedBox(
                height: 1,
                width: 150 * ruleT,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [
                        Colors.white.withValues(alpha: 0),
                        Colors.white.withValues(alpha: 0.55),
                        Colors.white.withValues(alpha: 0),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Opacity(
                opacity: mottoT,
                child: Transform.translate(
                  offset: Offset(0, 8 * (1 - mottoT)),
                  child: DotMatrixText(
                    text: AppCopy.ringMotto,
                    color: Colors.white.withValues(alpha: 0.9),
                    dotSize: dot,
                    gap: dot * 0.45,
                    charGap: dot,
                  ),
                ),
              ),
            ],
          ),
        ),

        // Hairline loader so the wait reads as progress, not lag.
        Positioned(
          left: 0,
          right: 0,
          bottom: 64,
          child: Opacity(
            opacity: _seg(progress, 0.2, 0.38),
            child: Center(
              child: SizedBox(
                width: 64,
                height: 2,
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(AppColors.pillRadius),
                  child: Stack(
                    children: [
                      ColoredBox(
                        color: Colors.white.withValues(alpha: 0.22),
                        child: const SizedBox.expand(),
                      ),
                      FractionallySizedBox(
                        widthFactor: Curves.easeInOut.transform(progress),
                        child: ColoredBox(
                          color: Colors.white.withValues(alpha: 0.85),
                          child: const SizedBox.expand(),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

/// App name in white. One motion only: each letter fades and rises, staggered
/// left to right, then stops.
class _Wordmark extends StatelessWidget {
  const _Wordmark({required this.progress});

  final double progress;

  @override
  Widget build(BuildContext context) {
    final letters = AppCopy.appName.split('');

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(letters.length, (i) {
        final start = 0.2 + i * 0.055;
        final t = AppEntryIntro._seg(progress, start, start + 0.2);
        return Opacity(
          opacity: t,
          child: Transform.translate(
            offset: Offset(0, 20 * (1 - t)),
            child: Text(
              letters[i],
              style: const TextStyle(
                fontSize: 54,
                fontWeight: FontWeight.w900,
                letterSpacing: 2,
                height: 1.05,
                color: Colors.white,
              ),
            ),
          ),
        );
      }),
    );
  }
}

/// Brand pattern: a diagonal lattice of seed dots with a leaf on every fourth
/// cell, faded toward the centre so it never crowds the type.
class _LatticePatternPainter extends CustomPainter {
  const _LatticePatternPainter({required this.progress});

  final double progress;

  static const double _spacing = 34;

  @override
  void paint(Canvas canvas, Size size) {
    final t = AppEntryIntro._seg(progress, 0.06, 0.3);
    if (t <= 0) return;

    final centre = Offset(size.width / 2, size.height / 2);
    final clearRadius = size.width * 0.5;
    final dot = Paint();
    var row = 0;

    for (var y = -_spacing; y < size.height + _spacing; y += _spacing) {
      row++;
      // Offset every other row so the grid reads as a lattice, not a table.
      final xShift = row.isEven ? _spacing / 2 : 0.0;
      var col = 0;
      for (
        var x = -_spacing + xShift;
        x < size.width + _spacing;
        x += _spacing
      ) {
        col++;
        final at = Offset(x, y);

        // Hold the pattern back near the middle so the type stays clean.
        final clear = ((at - centre).distance / clearRadius).clamp(0.0, 1.0);
        final alpha = 0.16 * t * clear * clear;
        if (alpha <= 0.004) continue;

        if ((row + col) % 4 == 0) {
          canvas.save();
          canvas.translate(at.dx, at.dy);
          canvas.rotate(row.isEven ? 0.5 : -0.5);
          _paintLeaf(canvas, 9, Colors.white.withValues(alpha: alpha));
          canvas.restore();
        } else {
          dot.color = Colors.white.withValues(alpha: alpha * 0.9);
          canvas.drawCircle(at, 1.6, dot);
        }
      }
    }
  }

  @override
  bool shouldRepaint(_LatticePatternPainter oldDelegate) =>
      oldDelegate.progress != progress;
}

/// Two-arc leaf with a midrib, drawn around the origin.
void _paintLeaf(Canvas canvas, double size, Color color) {
  final path = Path()
    ..moveTo(0, -size / 2)
    ..quadraticBezierTo(size * 0.52, -size * 0.08, 0, size / 2)
    ..quadraticBezierTo(-size * 0.52, -size * 0.08, 0, -size / 2)
    ..close();
  canvas.drawPath(path, Paint()..color = color);
  canvas.drawLine(
    Offset(0, -size / 2),
    Offset(0, size / 2),
    Paint()
      ..color = color.withValues(alpha: color.a * 0.6)
      ..strokeWidth = 0.8,
  );
}

/// Long, near-flat arcs sweeping left to right — the wind the particles ride.
class _WindStreakPainter extends CustomPainter {
  const _WindStreakPainter({required this.progress});

  final double progress;

  static const List<({double y, double length, double delay, double width})>
  _streaks = [
    (y: 0.16, length: 0.34, delay: 0.02, width: 1.4),
    (y: 0.29, length: 0.22, delay: 0.24, width: 1.0),
    (y: 0.68, length: 0.30, delay: 0.12, width: 1.2),
    (y: 0.78, length: 0.18, delay: 0.40, width: 0.9),
    (y: 0.90, length: 0.26, delay: 0.30, width: 1.1),
  ];

  @override
  void paint(Canvas canvas, Size size) {
    for (final s in _streaks) {
      final t = ((progress - s.delay) / 0.55).clamp(0.0, 1.0);
      if (t <= 0 || t >= 1) continue;

      final fade = math.sin(t * math.pi);
      // Head runs off the right edge; the tail follows a fixed length behind.
      final headX = size.width * (-0.25 + 1.5 * t);
      final y = size.height * s.y;
      final tailX = headX - size.width * s.length;

      final path = Path()
        ..moveTo(tailX, y)
        ..quadraticBezierTo(
          (tailX + headX) / 2,
          y - size.height * 0.02,
          headX,
          y,
        );

      canvas.drawPath(
        path,
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeCap = StrokeCap.round
          ..strokeWidth = s.width
          ..color = Colors.white.withValues(alpha: 0.20 * fade),
      );
    }
  }

  @override
  bool shouldRepaint(_WindStreakPainter oldDelegate) =>
      oldDelegate.progress != progress;
}

/// A light wind carrying seeds and leaves diagonally across the screen.
///
/// Each particle runs its own slice of [progress] and fades in and out on a
/// sine, so nothing pops in or cuts off at the edges. Kept at low alpha — this
/// is texture behind the type, not an illustration in front of it.
class _WindParticlePainter extends CustomPainter {
  const _WindParticlePainter({required this.progress});

  final double progress;

  static const List<_Particle> _particles = [
    _Particle(
      x: -0.08,
      y: 0.74,
      dx: 0.50,
      dy: -0.30,
      size: 9,
      spin: 1.4,
      delay: 0.00,
      leaf: true,
    ),
    _Particle(
      x: -0.14,
      y: 0.40,
      dx: 0.62,
      dy: -0.16,
      size: 5,
      spin: 0.0,
      delay: 0.04,
      leaf: false,
    ),
    _Particle(
      x: -0.10,
      y: 0.90,
      dx: 0.44,
      dy: -0.42,
      size: 12,
      spin: -1.1,
      delay: 0.08,
      leaf: true,
    ),
    _Particle(
      x: 0.16,
      y: 1.06,
      dx: 0.34,
      dy: -0.52,
      size: 4,
      spin: 0.0,
      delay: 0.12,
      leaf: false,
    ),
    _Particle(
      x: -0.06,
      y: 0.22,
      dx: 0.55,
      dy: -0.10,
      size: 7,
      spin: 0.9,
      delay: 0.16,
      leaf: true,
    ),
    _Particle(
      x: 0.40,
      y: 1.10,
      dx: 0.30,
      dy: -0.46,
      size: 5,
      spin: 0.0,
      delay: 0.20,
      leaf: false,
    ),
    _Particle(
      x: -0.12,
      y: 0.60,
      dx: 0.66,
      dy: -0.24,
      size: 10,
      spin: -0.7,
      delay: 0.24,
      leaf: true,
    ),
    _Particle(
      x: 0.62,
      y: 1.08,
      dx: 0.26,
      dy: -0.40,
      size: 4,
      spin: 0.0,
      delay: 0.28,
      leaf: false,
    ),
    _Particle(
      x: 0.04,
      y: 0.14,
      dx: 0.48,
      dy: 0.08,
      size: 6,
      spin: 1.2,
      delay: 0.32,
      leaf: true,
    ),
    _Particle(
      x: -0.16,
      y: 0.52,
      dx: 0.72,
      dy: -0.34,
      size: 8,
      spin: -1.3,
      delay: 0.10,
      leaf: true,
    ),
    _Particle(
      x: -0.05,
      y: 1.02,
      dx: 0.40,
      dy: -0.60,
      size: 5,
      spin: 0.0,
      delay: 0.18,
      leaf: false,
    ),
    _Particle(
      x: 0.28,
      y: -0.06,
      dx: 0.42,
      dy: 0.26,
      size: 7,
      spin: 0.6,
      delay: 0.22,
      leaf: true,
    ),
    _Particle(
      x: -0.11,
      y: 0.08,
      dx: 0.58,
      dy: 0.18,
      size: 4,
      spin: 0.0,
      delay: 0.26,
      leaf: false,
    ),
    _Particle(
      x: 0.78,
      y: 1.04,
      dx: 0.22,
      dy: -0.36,
      size: 11,
      spin: -0.9,
      delay: 0.30,
      leaf: true,
    ),
    _Particle(
      x: -0.09,
      y: 0.30,
      dx: 0.64,
      dy: 0.10,
      size: 6,
      spin: 1.0,
      delay: 0.36,
      leaf: true,
    ),
    _Particle(
      x: 0.50,
      y: -0.08,
      dx: 0.34,
      dy: 0.30,
      size: 4,
      spin: 0.0,
      delay: 0.40,
      leaf: false,
    ),
    _Particle(
      x: -0.13,
      y: 0.84,
      dx: 0.56,
      dy: -0.20,
      size: 5,
      spin: 0.0,
      delay: 0.44,
      leaf: false,
    ),
    _Particle(
      x: 0.10,
      y: 1.12,
      dx: 0.46,
      dy: -0.66,
      size: 9,
      spin: 1.5,
      delay: 0.48,
      leaf: true,
    ),
  ];

  @override
  void paint(Canvas canvas, Size size) {
    for (final p in _particles) {
      final t = ((progress - p.delay) / 0.62).clamp(0.0, 1.0);
      if (t <= 0 || t >= 1) continue;

      // Fade in and out across the crossing; gusts sway the path sideways.
      final fade = math.sin(t * math.pi);
      final sway = math.sin(t * math.pi * 2 + p.delay * 6) * size.height * 0.03;
      final centre = Offset(
        size.width * (p.x + p.dx * t),
        size.height * (p.y + p.dy * t) + sway,
      );

      final color = Colors.white.withValues(
        alpha: (p.leaf ? 0.26 : 0.34) * fade,
      );

      if (!p.leaf) {
        canvas.drawCircle(centre, p.size / 2, Paint()..color = color);
        continue;
      }

      canvas.save();
      canvas.translate(centre.dx, centre.dy);
      canvas.rotate(t * p.spin * math.pi * 2);
      _paintLeaf(canvas, p.size, color);
      canvas.restore();
    }
  }

  @override
  bool shouldRepaint(_WindParticlePainter oldDelegate) =>
      oldDelegate.progress != progress;
}

/// One wind-borne seed or leaf. Positions and travel are fractions of the
/// canvas so the drift reads the same on any screen size.
class _Particle {
  const _Particle({
    required this.x,
    required this.y,
    required this.dx,
    required this.dy,
    required this.size,
    required this.spin,
    required this.delay,
    required this.leaf,
  });

  final double x;
  final double y;
  final double dx;
  final double dy;
  final double size;
  final double spin;
  final double delay;
  final bool leaf;
}
