import 'package:flutter/material.dart';

/// Bottom navigation palette — dark bar with lime-green labels/icons.
abstract final class DashboardNavColors {
  static const Color barBackground = Color(0xFF555752);
  static const Color itemColor = Color(0xFF76A33E);
}

enum DashboardTab {
  home(Icons.home_outlined, 'Home'),
  events(Icons.calendar_month_outlined, 'Programs'),
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
  });

  final int currentIndex;
  final ValueChanged<int> onTap;

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
                    tab: DashboardTab.values[i],
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
    required this.tab,
    required this.selected,
    required this.onTap,
  });

  final DashboardTab tab;
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
            Icon(tab.icon, size: 22, color: DashboardNavColors.itemColor),
            const SizedBox(height: 2),
            Text(
              tab.label,
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
