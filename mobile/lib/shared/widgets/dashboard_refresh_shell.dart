import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme.dart';

/// Wrap the tab stack once: the indicator only hears depth-0 scrolls and
/// [IndexedStack] isn't a viewport, so the visible tab's scroll view drives it
/// (nested carousels are ignored). [onRefresh] should reload and remount the
/// tabs (e.g. bump a key).
class DashboardRefreshShell extends StatelessWidget {
  const DashboardRefreshShell({
    super.key,
    required this.onRefresh,
    required this.child,
    this.edgeOffset,
  });

  final Future<void> Function() onRefresh;
  final Widget child;

  /// Defaults to the status-bar height since tabs usually draw their own
  /// [SafeArea]; pass `0` inside one.
  final double? edgeOffset;

  /// So a near-instant reload still reads as something happened.
  static const Duration minimumSpinDuration = Duration(milliseconds: 600);

  /// About mid-drag, without leaving thumb reach on short screens.
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
    // Short tabs must stay pullable; platform physics stay the parent so
    // Android keeps clamping.
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
