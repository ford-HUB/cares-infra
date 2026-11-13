import 'package:flutter/material.dart';
import 'package:mobile/core/session/app_role.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/dashboard/data/models/notification_models.dart';
import 'package:mobile/shared/widgets/ground_card.dart';

import 'package:mobile/features/dashboard/widgets/cancelled_notification_tile.dart';

/// "Showing Volunteer updates" plus, when other sides of the account have
/// unread news, one line per side with a button to switch over to it.
class NotificationSideBanner extends StatelessWidget {
  const NotificationSideBanner({
    super.key,
    required this.activeRole,
    required this.otherSides,
    required this.onSwitch,
  });

  final AppRole? activeRole;
  final Map<AppRole, int> otherSides;
  final ValueChanged<AppRole> onSwitch;

  @override
  Widget build(BuildContext context) {
    final role = activeRole;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (role != null)
          Row(
            children: [
              Icon(role.icon, size: 16, color: role.accentColor),
              const SizedBox(width: 6),
              Text(
                'Showing ${role.label} updates',
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textSecondary,
                ),
              ),
            ],
          ),
        for (final entry in otherSides.entries)
          Container(
            margin: const EdgeInsets.only(top: 8),
            padding: const EdgeInsets.fromLTRB(12, 4, 4, 4),
            decoration: BoxDecoration(
              color: entry.key.accentColor.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Row(
              children: [
                Icon(entry.key.icon, size: 18, color: entry.key.accentColor),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    '${entry.value} unread on your ${entry.key.label} side',
                    style: const TextStyle(
                      fontSize: 13,
                      color: AppColors.textPrimary,
                    ),
                  ),
                ),
                TextButton(
                  onPressed: () => onSwitch(entry.key),
                  style: TextButton.styleFrom(
                    foregroundColor: entry.key.accentColor,
                  ),
                  child: const Text('Switch'),
                ),
              ],
            ),
          ),
      ],
    );
  }
}

/// All, then the time windows (Today, This week), then one chip per kind of
/// notification the open side actually has. A window and a kind can both be
/// on at once; tapping a selected chip turns it off, and All clears both.
class NotificationFilterChips extends StatelessWidget {
  const NotificationFilterChips({
    super.key,
    required this.types,
    required this.selected,
    required this.onSelected,
    required this.period,
    required this.onPeriodSelected,
  });

  final List<NotificationType> types;
  final NotificationType? selected;
  final ValueChanged<NotificationType?> onSelected;
  final NotificationPeriod? period;
  final ValueChanged<NotificationPeriod?> onPeriodSelected;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 40,
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 20),
        children: [
          _chip('All', selected == null && period == null, () {
            onSelected(null);
            onPeriodSelected(null);
          }),
          for (final option in NotificationPeriod.values)
            _chip(
              option.label,
              period == option,
              () => onPeriodSelected(period == option ? null : option),
            ),
          if (types.length > 1) ...[
            Container(
              width: 1,
              margin: const EdgeInsets.fromLTRB(2, 10, 10, 10),
              color: AppColors.borderLight,
            ),
            for (final type in types)
              _chip(
                type.label,
                selected == type,
                () => onSelected(selected == type ? null : type),
              ),
          ],
        ],
      ),
    );
  }

  Widget _chip(String label, bool isSelected, VoidCallback onTap) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: ChoiceChip(
        label: Text(label),
        selected: isSelected,
        onSelected: (_) => onTap(),
        selectedColor: AppColors.primary.withValues(alpha: 0.14),
        labelStyle: TextStyle(
          fontSize: 13,
          fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
          color: isSelected ? AppColors.primary : AppColors.textSecondary,
        ),
        side: BorderSide(
          color: isSelected ? AppColors.primary : AppColors.borderLight,
        ),
        showCheckmark: false,
      ),
    );
  }
}

class NotificationTile extends StatelessWidget {
  const NotificationTile({
    super.key,
    required this.notification,
    required this.onTap,
  });

  final AppNotification notification;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    if (notification.isCancellation) {
      return CancelledEventNotificationTile(
        notification: notification,
        onTap: onTap,
      );
    }
    final accent = notification.attention
        ? AppColors.accentOrange
        : AppColors.primary;
    return GroundCard(
      wave: true,
      onTap: onTap,
      padding: const EdgeInsets.fromLTRB(18, 18, 14, 18),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: AppDecorations.iconTile(tint: accent),
            child: Icon(
              iconForNotificationType(notification.type),
              size: 28,
              color: accent,
            ),
          ),
          Container(
            width: 1.5,
            height: 50,
            margin: const EdgeInsets.symmetric(horizontal: 14, vertical: 3),
            color: AppColors.primary.withValues(alpha: 0.35),
          ),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  notification.title,
                  style: TextStyle(
                    fontSize: 17.5,
                    height: 1.25,
                    fontWeight: notification.isUnread
                        ? FontWeight.w800
                        : FontWeight.w700,
                    color: AppColors.deepHeaderTop,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  notification.message,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 14.5,
                    color: AppColors.textSecondary,
                    height: 1.4,
                  ),
                ),
                const SizedBox(height: 10),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 14,
                    vertical: 6,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.secondary.withValues(alpha: 0.16),
                    borderRadius: BorderRadius.circular(AppColors.pillRadius),
                  ),
                  child: Text(
                    '${notification.type.label} · ${notification.timeAgo}',
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: AppColors.primaryDark,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 6),
          Padding(
            padding: const EdgeInsets.only(top: 6),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (notification.isUnread)
                  Container(
                    width: 10,
                    height: 10,
                    margin: const EdgeInsets.only(right: 6),
                    decoration: const BoxDecoration(
                      color: Color(0xFF3E9B2E),
                      shape: BoxShape.circle,
                    ),
                  ),
                const Icon(
                  Icons.chevron_right_rounded,
                  size: 28,
                  color: AppColors.primary,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class NotificationDetailSheet extends StatelessWidget {
  const NotificationDetailSheet({super.key, required this.notification});

  final AppNotification notification;

  @override
  Widget build(BuildContext context) {
    final tint = notification.isCancellation
        ? AppColors.error
        : AppColors.primary;
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 0, 16, 24),
      padding: const EdgeInsets.fromLTRB(24, 12, 24, 24),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(24),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 40,
            height: 4,
            margin: const EdgeInsets.only(bottom: 20),
            decoration: BoxDecoration(
              color: AppColors.inputFill,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: tint.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(
              notification.isCancellation
                  ? Icons.event_busy_rounded
                  : iconForNotificationType(notification.type),
              color: tint,
              size: 28,
            ),
          ),
          const SizedBox(height: 16),
          Text(
            notification.title,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w800,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            '${notification.type.label} · ${notification.timeAgo}',
            style: const TextStyle(fontSize: 13, color: AppColors.textMuted),
          ),
          if (!notification.isCancellation) ...[
            const SizedBox(height: 16),
            Text(
              notification.message,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 15,
                color: AppColors.textSecondary,
                height: 1.55,
              ),
            ),
          ],
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: () => Navigator.of(context).pop(),
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.primary,
                minimumSize: const Size.fromHeight(48),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: const Text(
                'Dismiss',
                style: TextStyle(fontWeight: FontWeight.w700),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
