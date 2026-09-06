import 'package:flutter/material.dart';

/// Bottom navigation palette — dark bar with lime-green labels/icons.
abstract final class DashboardNavColors {
  static const Color barBackground = Color(0xFF555752);
  static const Color itemColor = Color(0xFF76A33E);
}

enum DashboardTab {
  home(Icons.home_outlined, 'Home'),
  events(Icons.calendar_month_outlined, 'Events'),
  activity(Icons.bar_chart_outlined, 'Activity'),
  ranks(Icons.emoji_events_outlined, 'Ranks'),
  profile(Icons.person_outline, 'Profile');

  const DashboardTab(this.icon, this.label);

  final IconData icon;
  final String label;
}

class DashboardBottomNav extends StatelessWidget {
  const DashboardBottomNav({
    super.key,
    required this.currentIndex,
    required this.onTap,
    this.eventsTabLabel,
    this.ranksTabLabel,
    this.ranksTabIcon,
  });

  final int currentIndex;
  final ValueChanged<int> onTap;

  /// Overrides [DashboardTab.ranks] without changing the shared layout or
  /// navigation order (e.g. 'Request' for the beneficiary dashboard).
  final String? ranksTabLabel;
  final IconData? ranksTabIcon;

  /// Overrides the label of [DashboardTab.events] without changing the
  /// shared layout, icons, or navigation order (e.g. 'Campaigns' for the
  /// donor dashboard vs the default 'Events' for volunteers).
  final String? eventsTabLabel;

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: DashboardNavColors.barBackground,
      child: SafeArea(
        top: false,
        minimum: EdgeInsets.zero,
        child: SizedBox(
          height: 52,
          child: Row(
            children: [
              for (var i = 0; i < DashboardTab.values.length; i++)
                Expanded(
                  child: _NavItem(
                    icon: DashboardTab.values[i] == DashboardTab.ranks
                        ? (ranksTabIcon ?? DashboardTab.values[i].icon)
                        : DashboardTab.values[i].icon,
                    label: switch (DashboardTab.values[i]) {
                      DashboardTab.events =>
                        eventsTabLabel ?? DashboardTab.events.label,
                      DashboardTab.ranks =>
                        ranksTabLabel ?? DashboardTab.ranks.label,
                      final tab => tab.label,
                    },
                    selected: currentIndex == i,
                    onTap: () => onTap(i),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  const _NavItem({
    required this.icon,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          mainAxisSize: MainAxisSize.max,
          children: [
            Icon(icon, size: 22, color: DashboardNavColors.itemColor),
            const SizedBox(height: 2),
            Text(
              label,
              style: TextStyle(
                fontSize: 10,
                fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                color: DashboardNavColors.itemColor,
                height: 1,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
