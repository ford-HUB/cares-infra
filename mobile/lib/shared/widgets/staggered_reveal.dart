import 'package:flutter/material.dart';

/// Eased 0→1 progress of [t] across the `[start, end]` slice of an intro.
double staggeredInterval(double t, double start, double end) {
  if (t <= start) return 0;
  if (t >= end) return 1;
  return Curves.easeOutCubic.transform((t - start) / (end - start));
}

/// Fades and lifts [child] in while a parent intro animation's [progress]
/// passes through `[start, end]` — the stagger used on the login screen.
class StaggeredReveal extends StatelessWidget {
  const StaggeredReveal({
    super.key,
    required this.progress,
    required this.start,
    required this.end,
    required this.child,
    this.lift = 28,
  });

  final double progress;
  final double start;
  final double end;
  final double lift;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final value = staggeredInterval(progress, start, end);
    return Opacity(
      opacity: value,
      child: Transform.translate(
        offset: Offset(0, (1 - value) * lift),
        child: child,
      ),
    );
  }
}
