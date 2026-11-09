import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:mobile/core/theme/app_theme.dart';

/// Green header band used at the top of every non-hero mobile screen.
///
/// * default — fresh gradient (registration, settings, sub-pages).
/// * [HeaderBand.deep] — deep forest green (dashboard tabs, notifications).
///
/// Rounded bottom corners, a soft lighter wave sweeping up on the right, and
/// white status-bar icons. [child] is laid out below the status bar inset.
class HeaderBand extends StatelessWidget {
  const HeaderBand({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.fromLTRB(20, 10, 20, 24),
    this.radius = 28,
  }) : deep = false;

  const HeaderBand.deep({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.fromLTRB(20, 14, 20, 24),
    this.radius = 30,
  }) : deep = true;

  final Widget child;
  final EdgeInsets padding;
  final double radius;
  final bool deep;

  @override
  Widget build(BuildContext context) {
    final topInset = MediaQuery.paddingOf(context).top;
    final shape = BorderRadius.vertical(bottom: Radius.circular(radius));

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light,
      child: DecoratedBox(
        decoration: BoxDecoration(
          gradient: deep ? AppGradients.deepHeader : AppGradients.header,
          borderRadius: shape,
          boxShadow: const [
            BoxShadow(
              color: Color(0x2E0B3A1A),
              blurRadius: 22,
              offset: Offset(0, 10),
            ),
          ],
        ),
        child: ClipRRect(
          borderRadius: shape,
          child: CustomPaint(
            painter: _HeaderWavePainter(deep: deep),
            child: Padding(
              padding: padding.copyWith(top: padding.top + topInset),
              child: child,
            ),
          ),
        ),
      ),
    );
  }
}

class _HeaderWavePainter extends CustomPainter {
  const _HeaderWavePainter({required this.deep});

  final bool deep;

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;
    final sweep = Path()
      ..moveTo(w * 0.30, h)
      ..cubicTo(w * 0.55, h * 0.92, w * 0.70, h * 0.38, w, h * 0.22)
      ..lineTo(w, h)
      ..close();
    canvas.drawPath(
      sweep,
      Paint()
        ..color = (deep ? AppColors.secondary : Colors.white).withValues(
          alpha: deep ? 0.16 : 0.08,
        ),
    );
    final glow = Path()
      ..moveTo(0, h * 0.18)
      ..cubicTo(w * 0.18, h * 0.02, w * 0.36, 0, w * 0.5, 0)
      ..lineTo(0, 0)
      ..close();
    canvas.drawPath(
      glow,
      Paint()..color = Colors.white.withValues(alpha: deep ? 0.05 : 0.07),
    );
  }

  @override
  bool shouldRepaint(_HeaderWavePainter old) => old.deep != deep;
}

/// Title + optional subtitle block for a [HeaderBand].
class HeaderBandTitle extends StatelessWidget {
  const HeaderBandTitle({
    super.key,
    required this.title,
    this.subtitle,
    this.center = false,
  });

  final String title;
  final String? subtitle;
  final bool center;

  @override
  Widget build(BuildContext context) {
    final align = center ? TextAlign.center : TextAlign.start;
    return Column(
      crossAxisAlignment: center
          ? CrossAxisAlignment.center
          : CrossAxisAlignment.start,
      children: [
        Text(
          title,
          textAlign: align,
          style: const TextStyle(
            fontSize: 26,
            fontWeight: FontWeight.w800,
            color: Colors.white,
            height: 1.2,
            letterSpacing: -0.3,
          ),
        ),
        if (subtitle != null) ...[
          const SizedBox(height: 8),
          Text(
            subtitle!,
            textAlign: align,
            style: TextStyle(
              fontSize: 15,
              height: 1.45,
              color: Colors.white.withValues(alpha: 0.9),
            ),
          ),
        ],
      ],
    );
  }
}

/// Deep green ground that a dashboard tab's content floats over: the deep
/// header gradient, a lighter sweep on the right, and a gently curved bottom
/// edge. Size it with `Positioned` behind the scrolling content.
class DeepGround extends StatelessWidget {
  const DeepGround({super.key, this.child});

  final Widget? child;

  @override
  Widget build(BuildContext context) {
    return ClipPath(
      clipper: const _CurvedBottomClipper(),
      child: DecoratedBox(
        decoration: const BoxDecoration(gradient: AppGradients.deepHeader),
        child: CustomPaint(
          painter: const _HeaderWavePainter(deep: true),
          child: child ?? const SizedBox.expand(),
        ),
      ),
    );
  }
}

class _CurvedBottomClipper extends CustomClipper<Path> {
  const _CurvedBottomClipper();

  @override
  Path getClip(Size size) {
    final w = size.width;
    final h = size.height;
    return Path()
      ..lineTo(w, 0)
      ..lineTo(w, h - 30)
      ..quadraticBezierTo(w * 0.5, h + 26, 0, h - 30)
      ..close();
  }

  @override
  bool shouldReclip(_CurvedBottomClipper oldClipper) => false;
}
