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

/// One entry of the bottom bar. Each role supplies its own list, so the
/// navigation changes with the active role.
class DashboardNavItem {
  const DashboardNavItem({required this.icon, required this.label});

  final IconData icon;
  final String label;
}

/// The navigation of each role, as shown by that role's dashboard shell.
abstract final class DashboardNavItems {
  static const volunteer = [
    DashboardNavItem(icon: Icons.home_outlined, label: 'Home'),
    DashboardNavItem(icon: Icons.calendar_month_outlined, label: 'Events'),
    DashboardNavItem(icon: Icons.bar_chart_outlined, label: 'Activity'),
    DashboardNavItem(icon: Icons.emoji_events_outlined, label: 'Ranks'),
    DashboardNavItem(icon: Icons.person_outline, label: 'Profile'),
  ];

  static const beneficiary = [
    DashboardNavItem(icon: Icons.home_outlined, label: 'Home'),
    DashboardNavItem(icon: Icons.calendar_month_outlined, label: 'Events'),
    DashboardNavItem(icon: Icons.request_page_outlined, label: 'Requests'),
    DashboardNavItem(icon: Icons.bar_chart_outlined, label: 'Activity'),
    DashboardNavItem(icon: Icons.person_outline, label: 'Profile'),
  ];

  static const donor = [
    DashboardNavItem(icon: Icons.home_outlined, label: 'Home'),
    DashboardNavItem(icon: Icons.card_giftcard_rounded, label: 'Donations'),
    DashboardNavItem(icon: Icons.bar_chart_outlined, label: 'Activity'),
    DashboardNavItem(icon: Icons.emoji_events_outlined, label: 'Ranks'),
    DashboardNavItem(icon: Icons.person_outline, label: 'Profile'),
  ];
}

class DashboardBottomNav extends StatelessWidget {
  const DashboardBottomNav({
    super.key,
    required this.currentIndex,
    required this.onTap,
    this.items = DashboardNavItems.volunteer,
  });

  final int currentIndex;
  final ValueChanged<int> onTap;

  /// Navigation entries for the active role.
  final List<DashboardNavItem> items;

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
              for (var i = 0; i < items.length; i++)
                Expanded(
                  child: _NavItem(
                    icon: items[i].icon,
                    label: items[i].label,
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
