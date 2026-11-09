import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme.dart';

/// The empty-state mark from the reference set: an outlined green icon on a
/// soft pale-green blob, with three short "sparkle" strokes at its top-right.
class EmptyIllustration extends StatelessWidget {
  const EmptyIllustration({
    super.key,
    this.icon = Icons.event_busy_outlined,
    this.size = 120,
  });

  final IconData icon;
  final double size;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size * 1.35,
      height: size,
      child: CustomPaint(
        painter: _BlobPainter(),
        child: Center(
          child: Icon(icon, size: size * 0.6, color: AppColors.primary),
        ),
      ),
    );
  }
}

class _BlobPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;
    final blob = Path()
      ..moveTo(w * 0.12, h * 0.62)
      ..cubicTo(w * 0.10, h * 0.40, w * 0.40, h * 0.30, w * 0.62, h * 0.34)
      ..cubicTo(w * 0.86, h * 0.38, w * 0.96, h * 0.56, w * 0.84, h * 0.76)
      ..cubicTo(w * 0.70, h * 0.98, w * 0.30, h * 0.96, w * 0.16, h * 0.82)
      ..cubicTo(w * 0.12, h * 0.76, w * 0.12, h * 0.70, w * 0.12, h * 0.62)
      ..close();
    canvas.drawPath(
      blob,
      Paint()..color = AppColors.secondary.withValues(alpha: 0.16),
    );

    final stroke = Paint()
      ..color = const Color(0xFF4C9A2A)
      ..strokeWidth = size.height * 0.045
      ..strokeCap = StrokeCap.round;
    final o = Offset(w * 0.78, h * 0.14);
    final u = h * 0.11;
    canvas.drawLine(
      o + Offset(-u * 0.9, -u * 0.6),
      o + Offset(-u * 0.9, u * 0.2),
      stroke,
    );
    canvas.drawLine(
      o + Offset(0, u * 0.3),
      o + Offset(u * 0.7, -u * 0.4),
      stroke,
    );
    canvas.drawLine(
      o + Offset(u * 0.3, u * 1.2),
      o + Offset(u * 1.2, u * 1.2),
      stroke,
    );
  }

  @override
  bool shouldRepaint(_BlobPainter oldDelegate) => false;
}

/// Centered illustration + bold title + ink body — the full empty state.
class EmptyStateBlock extends StatelessWidget {
  const EmptyStateBlock({
    super.key,
    required this.title,
    required this.message,
    this.icon = Icons.event_busy_outlined,
    this.illustrationSize = 110,
  });

  final String title;
  final String message;
  final IconData icon;
  final double illustrationSize;

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        EmptyIllustration(icon: icon, size: illustrationSize),
        const SizedBox(height: 14),
        Text(
          title,
          textAlign: TextAlign.center,
          style: const TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.w800,
            color: AppColors.deepHeaderTop,
            height: 1.2,
          ),
        ),
        const SizedBox(height: 10),
        Text(
          message,
          textAlign: TextAlign.center,
          style: const TextStyle(
            fontSize: 15.5,
            height: 1.45,
            color: AppColors.textSecondary,
          ),
        ),
      ],
    );
  }
}
