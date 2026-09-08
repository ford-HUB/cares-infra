import 'package:flutter/material.dart';

/// Renders short text as a 5x7 dot-matrix display — square dots on a grid, the
/// way a station board or a weather kiosk shows a reading. Only the glyphs the
/// temperature readout needs are defined; anything else paints as a blank cell.
class DotMatrixText extends StatelessWidget {
  const DotMatrixText({
    super.key,
    required this.text,
    required this.color,
    this.dotSize = 2.4,
    this.gap = 1.0,
    this.charGap = 2.0,
    this.glowColor,
  });

  final String text;
  final Color color;

  /// Side of one square dot in logical pixels.
  final double dotSize;

  /// Space between dots inside a glyph.
  final double gap;

  /// Extra space between glyphs, on top of [gap].
  final double charGap;

  /// Optional halo painted under the dots so the readout survives a busy
  /// background.
  final Color? glowColor;

  static const _rows = 7;
  static const _cols = 5;

  static const Map<String, List<String>> _glyphs = {
    '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
    '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
    '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
    '3': ['11111', '00010', '00100', '00010', '00001', '10001', '01110'],
    '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
    '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
    '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
    '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
    '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
    '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
    '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
    '°': ['01100', '10010', '10010', '01100', '00000', '00000', '00000'],
    'C': ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
    ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
  };

  double get _cell => dotSize + gap;

  Size get _size {
    final chars = text.characters.length;
    final glyphWidth = _cols * _cell - gap;
    final width = chars == 0
        ? 0.0
        : chars * glyphWidth + (chars - 1) * (gap + charGap);
    return Size(width, _rows * _cell - gap);
  }

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      size: _size,
      painter: _DotMatrixPainter(
        text: text,
        color: color,
        glowColor: glowColor,
        dotSize: dotSize,
        gap: gap,
        charGap: charGap,
      ),
    );
  }
}

class _DotMatrixPainter extends CustomPainter {
  _DotMatrixPainter({
    required this.text,
    required this.color,
    required this.glowColor,
    required this.dotSize,
    required this.gap,
    required this.charGap,
  });

  final String text;
  final Color color;
  final Color? glowColor;
  final double dotSize;
  final double gap;
  final double charGap;

  @override
  void paint(Canvas canvas, Size size) {
    final cell = dotSize + gap;
    final glyphWidth = DotMatrixText._cols * cell - gap;
    final radius = Radius.circular(dotSize * 0.22);
    final paint = Paint()..color = color;
    final glow = glowColor == null
        ? null
        : (Paint()
          ..color = glowColor!
          ..maskFilter = MaskFilter.blur(BlurStyle.normal, dotSize * 0.9));

    var penX = 0.0;
    for (final char in text.characters) {
      final glyph = DotMatrixText._glyphs[char] ?? DotMatrixText._glyphs[' ']!;
      for (var row = 0; row < DotMatrixText._rows; row++) {
        for (var col = 0; col < DotMatrixText._cols; col++) {
          if (glyph[row][col] != '1') continue;
          final rect = RRect.fromRectAndRadius(
            Rect.fromLTWH(penX + col * cell, row * cell, dotSize, dotSize),
            radius,
          );
          // Two glow passes: the halo has to carry the dots on its own now
          // that the readout has no chip border behind it.
          if (glow != null) {
            canvas.drawRRect(rect.inflate(dotSize * 0.3), glow);
            canvas.drawRRect(rect, glow);
          }
          canvas.drawRRect(rect, paint);
        }
      }
      penX += glyphWidth + gap + charGap;
    }
  }

  @override
  bool shouldRepaint(_DotMatrixPainter oldDelegate) =>
      oldDelegate.text != text ||
      oldDelegate.color != color ||
      oldDelegate.glowColor != glowColor ||
      oldDelegate.dotSize != dotSize;
}
