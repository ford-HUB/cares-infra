import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme.dart';

/// Pull-to-refresh for a post-login dashboard shell.
///
/// Wrap the shell's tab stack once; any tab whose root is a scroll view then
/// refreshes when the user drags down from the top edge. Tabs don't need their
/// own [RefreshIndicator]: the indicator listens for depth-0 scroll
/// notifications, and an [IndexedStack] is not a viewport, so the visible
/// tab's own scroll view is the one it reacts to. Nested horizontal lists
/// (carousels) are deeper and ignored.
///
/// [onRefresh] should reload the shell's data and then remount the tabs (e.g.
/// by bumping a key on the stack) so every page — not only the visible one —
/// starts over.
class DashboardRefreshShell extends StatelessWidget {
  const DashboardRefreshShell({
    super.key,
    required this.onRefresh,
    required this.child,
    this.edgeOffset,
  });

  final Future<void> Function() onRefresh;
  final Widget child;

  /// Where the spinner starts from. Defaults to the status-bar height because
  /// most shells let each tab draw its own [SafeArea]; pass `0` when the shell
  /// already sits inside one.
  final double? edgeOffset;

  /// How long the spinner stays visible at minimum so a near-instant reload
  /// still reads as "something happened".
  static const Duration minimumSpinDuration = Duration(milliseconds: 600);

  /// Distance the spinner settles at while [onRefresh] runs — roughly the
  /// "drag to the middle" stretch the gesture is described with, without
  /// pushing the indicator out of thumb reach on short screens.
  static const double _displacement = 96;

  Future<void> _run() {
    return Future.wait<void>([
      onRefresh(),
      Future<void>.delayed(minimumSpinDuration),
    ]);
  }

  @override
  Widget build(BuildContext context) {
    final behavior = ScrollConfiguration.of(context);
    // Every tab must be pullable even when its content is shorter than the
    // screen, and the platform physics stay the parent so Android keeps its
    // clamping instead of bouncing forever.
    final physics = AlwaysScrollableScrollPhysics(
      parent: behavior.getScrollPhysics(context),
    );

    return RefreshIndicator(
      onRefresh: _run,
      color: AppColors.primary,
      backgroundColor: Colors.white,
      strokeWidth: 2.5,
      displacement: _displacement,
      edgeOffset: edgeOffset ?? MediaQuery.paddingOf(context).top,
      child: ScrollConfiguration(
        behavior: behavior.copyWith(physics: physics),
        child: child,
      ),
    );
  }
}
