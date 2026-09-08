import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme.dart';

/// Third-party sign-in providers offered in the UI.
///
/// Design-only for now — nothing here talks to Google, Facebook, or the CARES
/// backend. Screens hand these buttons a callback and decide what to mock.
enum SocialAuthProvider {
  google('Google'),
  facebook('Facebook');

  const SocialAuthProvider(this.label);

  final String label;
}

/// "or continue with" divider plus the Google / Facebook buttons.
class SocialAuthButtons extends StatelessWidget {
  const SocialAuthButtons({
    super.key,
    required this.onProviderTap,
    this.dividerLabel = 'or continue with',
    this.showDivider = true,
    this.compact = false,
  });

  final ValueChanged<SocialAuthProvider> onProviderTap;
  final String dividerLabel;
  final bool showDivider;

  /// Side-by-side icon buttons instead of full-width labelled rows.
  final bool compact;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (showDivider) ...[
          _DividerLabel(label: dividerLabel),
          const SizedBox(height: 16),
        ],
        if (compact)
          Row(
            children: [
              for (final provider in SocialAuthProvider.values) ...[
                Expanded(
                  child: SocialAuthButton(
                    provider: provider,
                    compact: true,
                    onTap: () => onProviderTap(provider),
                  ),
                ),
                if (provider != SocialAuthProvider.values.last)
                  const SizedBox(width: 12),
              ],
            ],
          )
        else
          for (final provider in SocialAuthProvider.values) ...[
            SocialAuthButton(
              provider: provider,
              onTap: () => onProviderTap(provider),
            ),
            if (provider != SocialAuthProvider.values.last)
              const SizedBox(height: 12),
          ],
      ],
    );
  }
}

/// A single provider button — white card, brand glyph, subtle press feedback.
class SocialAuthButton extends StatelessWidget {
  const SocialAuthButton({
    super.key,
    required this.provider,
    required this.onTap,
    this.compact = false,
  });

  final SocialAuthProvider provider;
  final VoidCallback onTap;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final glyph = provider == SocialAuthProvider.google
        ? const GoogleGlyph(size: 22)
        : const FacebookGlyph(size: 22);

    return Material(
      color: AppColors.surface,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Ink(
          height: 54,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.borderCard),
            boxShadow: const [
              BoxShadow(
                color: Color(0x0F1F5F28),
                blurRadius: 10,
                offset: Offset(0, 4),
              ),
            ],
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              glyph,
              const SizedBox(width: 10),
              Text(
                compact ? provider.label : 'Continue with ${provider.label}',
                style: const TextStyle(
                  fontSize: 14.5,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DividerLabel extends StatelessWidget {
  const _DividerLabel({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    final line = Expanded(
      child: Container(height: 1, color: AppColors.borderLight),
    );

    return Row(
      children: [
        line,
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.4,
              color: AppColors.secondary.withValues(alpha: 0.9),
            ),
          ),
        ),
        line,
      ],
    );
  }
}

/// Four-colour Google "G", painted so no image asset or plugin is needed.
class GoogleGlyph extends StatelessWidget {
  const GoogleGlyph({super.key, this.size = 22});

  final double size;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(painter: _GoogleGlyphPainter()),
    );
  }
}

class _GoogleGlyphPainter extends CustomPainter {
  static const _blue = Color(0xFF4285F4);
  static const _red = Color(0xFFEA4335);
  static const _yellow = Color(0xFFFBBC05);
  static const _green = Color(0xFF34A853);

  static double _rad(double degrees) => degrees * math.pi / 180;

  @override
  void paint(Canvas canvas, Size size) {
    final stroke = size.width * 0.22;
    final radius = (size.width - stroke) / 2;
    final center = Offset(size.width / 2, size.height / 2);
    final rect = Rect.fromCircle(center: center, radius: radius);

    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = stroke;

    void arc(double startDeg, double sweepDeg, Color color) {
      canvas.drawArc(rect, _rad(startDeg), _rad(sweepDeg), false, paint..color = color);
    }

    arc(-50, 105, _blue); // right shoulder
    arc(55, 75, _green); // bottom
    arc(130, 60, _yellow); // left
    arc(190, 120, _red); // top

    // Crossbar of the G.
    canvas.drawRect(
      Rect.fromLTRB(
        center.dx - stroke * 0.1,
        center.dy - stroke / 2,
        center.dx + radius + stroke / 2,
        center.dy + stroke / 2,
      ),
      Paint()..color = _blue,
    );
  }

  @override
  bool shouldRepaint(_GoogleGlyphPainter oldDelegate) => false;
}

/// Facebook "f" on the brand blue tile.
class FacebookGlyph extends StatelessWidget {
  const FacebookGlyph({super.key, this.size = 22});

  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: const Color(0xFF1877F2),
        borderRadius: BorderRadius.circular(size * 0.28),
      ),
      child: Text(
        'f',
        style: TextStyle(
          fontSize: size * 0.78,
          height: 1.05,
          fontWeight: FontWeight.w900,
          color: Colors.white,
        ),
      ),
    );
  }
}
