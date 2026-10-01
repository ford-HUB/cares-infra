import 'package:flutter/material.dart';
import 'package:mobile/core/constants/app_copy.dart';
import 'package:mobile/core/theme/app_theme.dart';

/// Kicker, headline and body for one slide. Each line arrives in turn —
/// sliding in from the side the story is moving toward — so the eye reads
/// top to bottom instead of taking in a block at once.
class LeadingCaption extends StatefulWidget {
  const LeadingCaption({
    super.key,
    required this.copy,
    required this.forward,
  });

  final LeadingSlideCopy copy;

  /// True when this slide was reached with Continue, false when with Back.
  final bool forward;

  @override
  State<LeadingCaption> createState() => _LeadingCaptionState();
}

class _LeadingCaptionState extends State<LeadingCaption>
    with SingleTickerProviderStateMixin {
  late final AnimationController _enter = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 900),
  )..forward();

  @override
  void dispose() {
    _enter.dispose();
    super.dispose();
  }

  Widget _stagger(double start, double end, Widget child) {
    final curve = CurvedAnimation(
      parent: _enter,
      curve: Interval(start, end, curve: Curves.easeOutCubic),
    );
    final from = Offset(widget.forward ? 0.12 : -0.12, 0);
    return FadeTransition(
      opacity: curve,
      child: SlideTransition(
        position: Tween(begin: from, end: Offset.zero).animate(curve),
        child: child,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final copy = widget.copy;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        _stagger(
          0.0,
          0.55,
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: AppColors.darkGreenField.withValues(alpha: 0.85),
              borderRadius: BorderRadius.circular(AppColors.pillRadius),
              border: Border.all(color: Colors.white.withValues(alpha: 0.12)),
            ),
            child: Text(
              copy.kicker.toUpperCase(),
              style: const TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w800,
                letterSpacing: 1.2,
                color: AppColors.onDarkGreenMuted,
              ),
            ),
          ),
        ),
        const SizedBox(height: 14),
        _stagger(
          0.12,
          0.7,
          Text(
            copy.title,
            style: const TextStyle(
              fontSize: 30,
              height: 1.12,
              fontWeight: FontWeight.w800,
              letterSpacing: -0.6,
              color: AppColors.onDarkGreen,
            ),
          ),
        ),
        const SizedBox(height: 12),
        _stagger(
          0.26,
          0.85,
          Text(
            copy.body,
            style: const TextStyle(
              fontSize: 15,
              height: 1.5,
              color: AppColors.onDarkGreenMuted,
            ),
          ),
        ),
      ],
    );
  }
}
