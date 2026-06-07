import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';

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
          backgroundColor: AppColors.inputFill,
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
                      color: AppColors.textMuted,
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
              onPressed: () {},
              icon: const Icon(Icons.notifications_none_rounded),
              color: AppColors.textPrimary,
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
      color: AppColors.inputFill,
      borderRadius: BorderRadius.circular(24),
      child: InkWell(
        onTap: onToggle,
        borderRadius: BorderRadius.circular(24),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(24),
            border: Border.all(
              color: AppColors.primary.withValues(alpha: 0.35),
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 18, color: AppColors.primary),
              const SizedBox(width: 6),
              Text(
                label,
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(width: 4),
              Icon(Icons.swap_horiz_rounded, size: 16, color: AppColors.primary),
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
    required this.onTap,
  });

  final int currentIndex;
  final ValueChanged<int> onTap;

  static const _items = [
    (Icons.home_rounded, 'Home'),
    (Icons.event_rounded, 'Events'),
    (Icons.assignment_rounded, 'Activities'),
    (Icons.leaderboard_rounded, 'Ranks'),
    (Icons.person_rounded, 'Profile'),
  ];

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.06),
            blurRadius: 12,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: List.generate(_items.length, (index) {
              final (icon, label) = _items[index];
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
