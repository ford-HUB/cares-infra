import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import '../screens/dashboard_notifications_screen.dart';

class DashboardHeader extends StatelessWidget {
  const DashboardHeader({
    super.key,
    required this.firstName,
    required this.isDonorMode,
    required this.onModeToggle,
    this.showNotificationDot = true,
  });

  final String firstName;
  final bool isDonorMode;
  final VoidCallback onModeToggle;
  final bool showNotificationDot;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        CircleAvatar(
          radius: 24,
          backgroundColor: AppColors.surface,
          child: Icon(Icons.person_rounded, color: AppColors.primary, size: 28),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Welcome back,',
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      fontSize: 13,
                      color: AppColors.textSecondary,
                    ),
              ),
              Text(
                firstName.isEmpty ? 'Volunteer' : firstName,
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  color: AppColors.textPrimary,
                  height: 1.1,
                ),
              ),
            ],
          ),
        ),
        VolunteerDonorToggle(isDonorMode: isDonorMode, onToggle: onModeToggle),
        const SizedBox(width: 8),
        Stack(
          clipBehavior: Clip.none,
          children: [
            IconButton(
              onPressed: () => DashboardNotificationsScreen.open(context),
              icon: const Icon(Icons.notifications_none_rounded),
              color: AppColors.primary,
              tooltip: 'Notifications',
            ),
            if (showNotificationDot)
              Positioned(
                top: 10,
                right: 10,
                child: Container(
                  width: 8,
                  height: 8,
                  decoration: const BoxDecoration(
                    color: AppColors.accentBright,
                    shape: BoxShape.circle,
                  ),
                ),
              ),
          ],
        ),
      ],
    );
  }
}

class VolunteerDonorToggle extends StatelessWidget {
  const VolunteerDonorToggle({
    super.key,
    required this.isDonorMode,
    required this.onToggle,
  });

  final bool isDonorMode;
  final VoidCallback onToggle;

  @override
  Widget build(BuildContext context) {
    final label = isDonorMode ? 'Donor' : 'Volunteer';
    final icon = isDonorMode ? Icons.favorite_rounded : Icons.volunteer_activism_rounded;

    return Material(
      color: AppColors.primary,
      borderRadius: BorderRadius.circular(AppColors.pillRadius),
      elevation: 0,
      child: InkWell(
        onTap: onToggle,
        borderRadius: BorderRadius.circular(AppColors.pillRadius),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 18, color: Colors.white),
              const SizedBox(width: 6),
              Text(
                label,
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: Colors.white,
                ),
              ),
              const SizedBox(width: 4),
              Icon(
                Icons.swap_horiz_rounded,
                size: 16,
                color: Colors.white.withValues(alpha: 0.85),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class DashboardBottomNav extends StatelessWidget {
  const DashboardBottomNav({
    super.key,
    required this.currentIndex,
    required this.isDonorMode,
    required this.onTap,
  });

  final int currentIndex;
  final bool isDonorMode;
  final ValueChanged<int> onTap;

  @override
  Widget build(BuildContext context) {
    final items = [
      (Icons.home_rounded, 'Home'),
      (
        isDonorMode ? Icons.favorite_rounded : Icons.event_rounded,
        isDonorMode ? 'Donations' : 'Events',
      ),
      (Icons.assignment_rounded, 'Activities'),
      (Icons.leaderboard_rounded, 'Ranks'),
      (Icons.person_rounded, 'Profile'),
    ];

    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        border: Border(
          top: BorderSide(color: AppColors.borderLight, width: 1),
        ),
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: List.generate(items.length, (index) {
              final (icon, label) = items[index];
              final selected = index == currentIndex;
              return Expanded(
                child: InkWell(
                  onTap: () => onTap(index),
                  borderRadius: BorderRadius.circular(12),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 6),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          icon,
                          size: 24,
                          color: selected
                              ? AppColors.primary
                              : AppColors.textMuted,
                        ),
                        const SizedBox(height: 4),
                        Text(
                          label,
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight:
                                selected ? FontWeight.w700 : FontWeight.w500,
                            color: selected
                                ? AppColors.primary
                                : AppColors.textMuted,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            }),
          ),
        ),
      ),
    );
  }
}
