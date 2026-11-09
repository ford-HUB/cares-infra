import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme.dart';

/// Bottom navigation palette — deep green bar, white items, lime active pill.
abstract final class DashboardNavColors {
  static const Color barBackground = AppColors.navBar;
  static const Color itemColor = Colors.white;
  static const Color activeColor = AppColors.navActive;
  static const Color activeFill = AppColors.navActiveFill;
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
    return DecoratedBox(
      decoration: const BoxDecoration(
        color: DashboardNavColors.barBackground,
        borderRadius: BorderRadius.vertical(top: Radius.circular(26)),
        boxShadow: [
          BoxShadow(
            color: Color(0x330B3A1A),
            blurRadius: 18,
            offset: Offset(0, -4),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        minimum: EdgeInsets.zero,
        child: Container(
          height: 76,
          padding: const EdgeInsets.fromLTRB(10, 8, 10, 8),
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
    final color = selected
        ? DashboardNavColors.activeColor
        : DashboardNavColors.itemColor;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 3),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(18),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 220),
            curve: Curves.easeOutCubic,
            decoration: BoxDecoration(
              color: selected
                  ? DashboardNavColors.activeFill
                  : Colors.transparent,
              borderRadius: BorderRadius.circular(18),
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(icon, size: 25, color: color),
                const SizedBox(height: 4),
                Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.fade,
                  softWrap: false,
                  style: TextStyle(
                    fontSize: 12.5,
                    fontWeight: selected ? FontWeight.w800 : FontWeight.w600,
                    color: color,
                    height: 1,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
