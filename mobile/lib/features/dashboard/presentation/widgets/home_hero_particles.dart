import 'package:flutter/material.dart';

/// Faint community glyphs scattered over the home tab's dark ground — trees,
/// people, hands, a heart — so the band reads as CARES rather than a flat
/// block. Purely decorative: ignores touches and never sits under the text
/// column on the left.
class HomeHeroParticles extends StatelessWidget {
  const HomeHeroParticles({super.key});

  static const _glyphs = <_Glyph>[
    _Glyph(Icons.park_rounded, right: 118, top: 0, size: 26, alpha: 0.10),
    _Glyph(Icons.groups_rounded, right: 26, top: 92, size: 30, alpha: 0.09),
    _Glyph(Icons.eco_rounded, right: 210, top: 118, size: 22, alpha: 0.08),
    _Glyph(
      Icons.volunteer_activism_rounded,
      right: 156,
      top: 154,
      size: 24,
      alpha: 0.09,
    ),
    _Glyph(Icons.favorite_rounded, right: 64, top: 176, size: 18, alpha: 0.08),
    _Glyph(
      Icons.handshake_rounded,
      right: 246,
      top: 196,
      size: 26,
      alpha: 0.07,
    ),
    _Glyph(Icons.park_rounded, right: 20, top: 236, size: 34, alpha: 0.08),
    _Glyph(Icons.person_rounded, right: 128, top: 252, size: 20, alpha: 0.07),
    _Glyph(Icons.eco_rounded, right: 300, top: 262, size: 18, alpha: 0.06),
    _Glyph(Icons.groups_rounded, right: 214, top: 300, size: 28, alpha: 0.07),
  ];

  @override
  Widget build(BuildContext context) {
    final topInset = MediaQuery.paddingOf(context).top;
    return IgnorePointer(
      child: Stack(
        clipBehavior: Clip.hardEdge,
        children: [
          for (final g in _glyphs)
            Positioned(
              right: g.right,
              top: topInset + g.top,
              child: Transform.rotate(
                angle: g.tilt,
                child: Icon(
                  g.icon,
                  size: g.size,
                  color: Colors.white.withValues(alpha: g.alpha),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _Glyph {
  const _Glyph(
    this.icon, {
    required this.right,
    required this.top,
    required this.size,
    required this.alpha,
  });

  final IconData icon;
  final double right;
  final double top;
  final double size;
  final double alpha;

  /// A little lean per glyph so the field doesn't look stamped.
  double get tilt => ((right + top) % 5 - 2) * 0.09;
}
