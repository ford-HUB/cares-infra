import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import '../data/notification_data.dart';

class DashboardNotificationsScreen extends StatefulWidget {
  const DashboardNotificationsScreen({super.key});

  static void open(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => const DashboardNotificationsScreen(),
      ),
    );
  }

  @override
  State<DashboardNotificationsScreen> createState() =>
      _DashboardNotificationsScreenState();
}

class _DashboardNotificationsScreenState
    extends State<DashboardNotificationsScreen> {
  late List<AppNotification> _notifications = List<AppNotification>.from(
    kMockNotifications,
  );

  int get _unreadCount => _notifications.where((n) => n.isUnread).length;

  void _markAsRead(String id) {
    setState(() {
      _notifications = _notifications
          .map(
            (n) => n.id == id
                ? AppNotification(
                    id: n.id,
                    title: n.title,
                    message: n.message,
                    timeAgo: n.timeAgo,
                    type: n.type,
                    isUnread: false,
                  )
                : n,
          )
          .toList();
    });
  }

  void _markAllRead() {
    setState(() {
      _notifications = _notifications
          .map(
            (n) => AppNotification(
              id: n.id,
              title: n.title,
              message: n.message,
              timeAgo: n.timeAgo,
              type: n.type,
              isUnread: false,
            ),
          )
          .toList();
    });
  }

  Future<void> _openNotification(AppNotification notification) async {
    _markAsRead(notification.id);
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) =>
          _NotificationDetailSheet(notification: notification),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Notifications'),
        backgroundColor: AppColors.background,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (_unreadCount > 0)
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 4, 12, 4),
              child: Align(
                alignment: Alignment.centerRight,
                child: TextButton.icon(
                  onPressed: _markAllRead,
                  icon: const Icon(Icons.done_all_rounded, size: 18),
                  label: const Text('Mark all as read'),
                  style: TextButton.styleFrom(
                    foregroundColor: AppColors.primary,
                    padding: const EdgeInsets.symmetric(horizontal: 8),
                  ),
                ),
              ),
            ),
          Expanded(
            child: _notifications.isEmpty
                ? const Center(
                    child: Text(
                      'No notifications yet.',
                      style: TextStyle(color: AppColors.textSecondary),
                    ),
                  )
                : ListView.separated(
                    padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
                    itemCount: _notifications.length,
                    separatorBuilder: (_, index) => const SizedBox(height: 10),
                    itemBuilder: (context, index) {
                      final notification = _notifications[index];
                      return _NotificationTile(
                        notification: notification,
                        onTap: () => _openNotification(notification),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}

class _NotificationTile extends StatelessWidget {
  const _NotificationTile({required this.notification, required this.onTap});

  final AppNotification notification;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.surface,
      borderRadius: BorderRadius.circular(AppColors.cardRadius),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppColors.cardRadius),
        child: Ink(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppColors.cardRadius),
            border: Border.all(
              color: notification.isUnread
                  ? AppColors.primary.withValues(alpha: 0.25)
                  : AppColors.borderLight,
            ),
            color: notification.isUnread
                ? AppColors.primary.withValues(alpha: 0.04)
                : AppColors.surface,
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  iconForNotificationType(notification.type),
                  size: 20,
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            notification.title,
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: notification.isUnread
                                  ? FontWeight.w800
                                  : FontWeight.w600,
                              color: AppColors.textPrimary,
                            ),
                          ),
                        ),
                        if (notification.isUnread)
                          Container(
                            width: 8,
                            height: 8,
                            margin: const EdgeInsets.only(left: 8),
                            decoration: const BoxDecoration(
                              color: AppColors.accentBright,
                              shape: BoxShape.circle,
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      notification.message,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 13,
                        color: AppColors.textSecondary,
                        height: 1.4,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      notification.timeAgo,
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppColors.textMuted,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 4),
              Icon(
                Icons.chevron_right_rounded,
                color: AppColors.textMuted.withValues(alpha: 0.8),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _NotificationDetailSheet extends StatelessWidget {
  const _NotificationDetailSheet({required this.notification});

  final AppNotification notification;

  @override
  Widget build(BuildContext context) {
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
              color: AppColors.primary.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(
              iconForNotificationType(notification.type),
              color: AppColors.primary,
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
            notification.timeAgo,
            style: const TextStyle(fontSize: 13, color: AppColors.textMuted),
          ),
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
