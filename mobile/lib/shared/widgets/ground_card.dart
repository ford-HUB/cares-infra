import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme.dart';

/// White card on the mint page ground: hairline green border, soft lift and,
/// optionally, the pale green wave tucked into its bottom-right corner (the
/// notification / empty-state cards in the reference set).
class GroundCard extends StatelessWidget {
  const GroundCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(20),
    this.radius = 22,
    this.wave = false,
    this.onTap,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final double radius;
  final bool wave;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final shape = BorderRadius.circular(radius);
    Widget body = Padding(padding: padding, child: child);
    if (wave) {
      body = CustomPaint(painter: const CardWavePainter(), child: body);
    }
    return DecoratedBox(
      decoration: AppDecorations.groundCard(radius: radius),
      child: ClipRRect(
        borderRadius: shape,
        child: Material(
          type: MaterialType.transparency,
          child: onTap == null
              ? body
              : InkWell(onTap: onTap, borderRadius: shape, child: body),
        ),
      ),
    );
  }
}

/// Two pale green swells rising into the bottom-right corner.
class CardWavePainter extends CustomPainter {
  const CardWavePainter();

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;
    Path swell(double start, double peak) => Path()
      ..moveTo(w * start, h)
      ..cubicTo(w * (start + 0.18), h, w * 0.86, h * peak, w, h * (peak - 0.1))
      ..lineTo(w, h)
      ..close();
    canvas.drawPath(
      swell(0.52, 0.52),
      Paint()..color = AppColors.secondary.withValues(alpha: 0.07),
    );
    canvas.drawPath(
      swell(0.66, 0.74),
      Paint()..color = AppColors.secondary.withValues(alpha: 0.10),
    );
  }

  @override
  bool shouldRepaint(CardWavePainter oldDelegate) => false;
}

/// Tinted icon tile, a thin vertical rule, then title + body — the heading
/// row used by notification cards, the terms dialog and category cards.
class IconTileHeading extends StatelessWidget {
  const IconTileHeading({
    super.key,
    required this.icon,
    required this.title,
    this.body,
    this.tint,
    this.trailing,
    this.titleSize = 18,
  });

  final IconData icon;
  final String title;
  final String? body;
  final Color? tint;
  final Widget? trailing;
  final double titleSize;

  @override
  Widget build(BuildContext context) {
    final color = tint ?? AppColors.primary;
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 52,
          height: 52,
          decoration: AppDecorations.iconTile(tint: color),
          child: Icon(icon, color: color, size: 26),
        ),
        Container(
          width: 1.5,
          height: 46,
          margin: const EdgeInsets.symmetric(horizontal: 14, vertical: 3),
          color: AppColors.primary.withValues(alpha: 0.35),
        ),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: TextStyle(
                  fontSize: titleSize,
                  fontWeight: FontWeight.w800,
                  color: AppColors.textPrimary,
                  height: 1.25,
                ),
              ),
              if (body != null) ...[
                const SizedBox(height: 6),
                Text(
                  body!,
                  style: const TextStyle(
                    fontSize: 14.5,
                    height: 1.4,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ],
          ),
        ),
        if (trailing != null) ...[const SizedBox(width: 8), trailing!],
      ],
    );
  }
}
