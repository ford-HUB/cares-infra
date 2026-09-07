import 'package:flutter/material.dart';
import 'package:mobile/core/constants/app_assets.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/dashboard/screens/dashboard_notifications_screen.dart';

class HomeHeader extends StatelessWidget {
  const HomeHeader({
    super.key,
    required this.firstName,
    required this.points,
    this.showNotificationDot = true,
    this.badgeLabel,
  });

  final String firstName;
  final int points;
  final bool showNotificationDot;

  /// Replaces the points pill, e.g. '2 active' on the beneficiary dashboard.
  final String? badgeLabel;

  String get _initial {
    final trimmed = firstName.trim();
    if (trimmed.isEmpty) return '?';
    return trimmed[0].toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        ClipOval(
          child: Image.asset(
            AppAssets.logo,
            width: 44,
            height: 44,
            fit: BoxFit.cover,
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Welcome back,',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                  color: AppColors.secondary.withValues(alpha: 0.95),
                ),
              ),
              Text(
                firstName,
                style: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                  color: AppColors.primaryDark,
                  height: 1.15,
                ),
              ),
            ],
          ),
        ),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
          decoration: BoxDecoration(
            color: AppColors.light.withValues(alpha: 0.55),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Text(
            badgeLabel ?? '${points}pts',
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: AppColors.primaryDark,
            ),
          ),
        ),
        Stack(
          clipBehavior: Clip.none,
          children: [
            IconButton(
              onPressed: () => DashboardNotificationsScreen.open(context),
              icon: const Icon(Icons.notifications_none_rounded),
              color: AppColors.primaryDark,
              tooltip: 'Notifications',
              visualDensity: VisualDensity.compact,
              padding: const EdgeInsets.all(8),
              constraints: const BoxConstraints(minWidth: 40, minHeight: 40),
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
