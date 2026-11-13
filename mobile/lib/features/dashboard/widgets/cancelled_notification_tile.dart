import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/dashboard/data/models/notification_models.dart';

/// Feed row for a cancelled event registration (or an event the organizer
/// called off): soft red card, crossed-out calendar, red title, and the time
/// with the unread dot in the corner. The title says everything, so the
/// server's follow-up line is left off.
class CancelledEventNotificationTile extends StatelessWidget {
  const CancelledEventNotificationTile({
    super.key,
    required this.notification,
    required this.onTap,
  });

  final AppNotification notification;
  final VoidCallback onTap;

  static const Color _fill = Color(0xFFFDECEC);
  static const Color _border = Color(0xFFF6CFCF);
  static const Color _iconFill = Color(0xFFF9D9D9);

  @override
  Widget build(BuildContext context) {
    final shape = BorderRadius.circular(18);
    return Material(
      color: _fill,
      shape: RoundedRectangleBorder(
        borderRadius: shape,
        side: const BorderSide(color: _border),
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 10, 16),
          child: Row(
            children: [
              Container(
                width: 52,
                height: 52,
                decoration: BoxDecoration(
                  color: _iconFill,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: const Icon(
                  Icons.event_busy_rounded,
                  size: 28,
                  color: AppColors.error,
                ),
              ),
              Container(
                width: 1.5,
                height: 46,
                margin: const EdgeInsets.symmetric(horizontal: 14),
                color: AppColors.error.withValues(alpha: 0.35),
              ),
              Expanded(
                child: Text(
                  notification.title,
                  style: TextStyle(
                    fontSize: 16.5,
                    height: 1.25,
                    fontWeight: notification.isUnread
                        ? FontWeight.w800
                        : FontWeight.w700,
                    color: AppColors.error,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        notification.timeAgo,
                        style: const TextStyle(
                          fontSize: 12.5,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textSecondary,
                        ),
                      ),
                      if (notification.isUnread)
                        Container(
                          width: 9,
                          height: 9,
                          margin: const EdgeInsets.only(left: 6),
                          decoration: const BoxDecoration(
                            color: AppColors.error,
                            shape: BoxShape.circle,
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  const Icon(
                    Icons.chevron_right_rounded,
                    size: 26,
                    color: AppColors.textSecondary,
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
