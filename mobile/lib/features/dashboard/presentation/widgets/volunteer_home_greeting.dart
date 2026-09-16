import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/dashboard/screens/dashboard_notifications_screen.dart';

/// Top of the volunteer home tab: today's date in small type, a time-of-day
/// greeting underneath, and the points pill + bell trailing on the greeting
/// row so the header stays one block.
class VolunteerHomeGreeting extends StatelessWidget {
  const VolunteerHomeGreeting({
    super.key,
    required this.firstName,
    required this.points,
    this.showNotificationDot = true,
    DateTime? now,
  }) : _now = now;

  final String firstName;
  final int points;
  final bool showNotificationDot;

  /// Injectable clock so tests and previews can pin the greeting.
  final DateTime? _now;

  @override
  Widget build(BuildContext context) {
    final now = _now ?? DateTime.now();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Points and bell share the date line so the greeting below gets the
        // full width and never has to truncate a name.
        Row(
          children: [
            Expanded(
              child: Text(
                'Today, ${_dateLabel(now)}',
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                  color: AppColors.textSecondary,
                ),
              ),
            ),
            _PointsPill(points: points),
            _NotificationBell(showDot: showNotificationDot),
          ],
        ),
        Text(
          '${_greeting(now.hour)}, $firstName!',
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.w800,
            color: AppColors.textPrimary,
            height: 1.2,
            letterSpacing: -0.3,
          ),
        ),
      ],
    );
  }

  static String _greeting(int hour) {
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  }

  static String _dateLabel(DateTime date) {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    return '${months[date.month - 1]} ${_ordinal(date.day)}';
  }

  static String _ordinal(int day) {
    if (day >= 11 && day <= 13) return '${day}th';
    switch (day % 10) {
      case 1:
        return '${day}st';
      case 2:
        return '${day}nd';
      case 3:
        return '${day}rd';
      default:
        return '${day}th';
    }
  }
}

class _PointsPill extends StatelessWidget {
  const _PointsPill({required this.points});

  final int points;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: AppColors.light.withValues(alpha: 0.55),
        borderRadius: BorderRadius.circular(AppColors.pillRadius),
      ),
      child: Text(
        '${points}pts',
        style: const TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w700,
          color: AppColors.primaryDark,
        ),
      ),
    );
  }
}

class _NotificationBell extends StatelessWidget {
  const _NotificationBell({required this.showDot});

  final bool showDot;

  @override
  Widget build(BuildContext context) {
    return Stack(
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
        if (showDot)
          Positioned(
            top: 10,
            right: 10,
            child: Container(
              width: 8,
              height: 8,
              decoration: const BoxDecoration(
                color: AppColors.accentOrange,
                shape: BoxShape.circle,
              ),
            ),
          ),
      ],
    );
  }
}
