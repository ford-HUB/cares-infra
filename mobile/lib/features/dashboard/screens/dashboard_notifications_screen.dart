import 'package:flutter/material.dart';
import '../../../core/session/app_role.dart';
import '../../../core/theme/app_theme.dart';
import '../data/models/notification_models.dart';
import '../data/notification_sync.dart';
import '../presentation/widgets/notification_host.dart';
import '../widgets/notification_feed_widgets.dart';

/// The feed for the side of the account that is open — event news, rulings
/// and reminders, certificates, donation and payment updates, request
/// decisions, support replies and announcements — plus anything about the
/// account itself. Read through [NotificationSync], which also pops new rows
/// as device notifications. Unread news on the account's other sides is
/// flagged at the top with a way to switch to it.
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
  final NotificationSync _sync = NotificationSync.instance;

  /// Null shows every kind.
  NotificationType? _filter;

  @override
  void initState() {
    super.initState();
    _sync.addListener(_onFeedChanged);
    _sync.refresh();
  }

  @override
  void dispose() {
    _sync.removeListener(_onFeedChanged);
    super.dispose();
  }

  void _onFeedChanged() {
    if (mounted) setState(() {});
  }

  /// Kinds present on this side, in the enum's order, for the chip row.
  List<NotificationType> _typesIn(List<AppNotification> feed) {
    final present = feed.map((item) => item.type).toSet();
    return NotificationType.values.where(present.contains).toList();
  }

  Future<void> _openNotification(AppNotification notification) async {
    if (notification.isUnread) await _sync.markRead(notification.id);
    if (!mounted) return;
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => NotificationDetailSheet(notification: notification),
    );
  }

  @override
  Widget build(BuildContext context) {
    final feed = _sync.feed;
    final types = _typesIn(feed);
    // A filter whose last row was cleared away falls back to All.
    final filter = types.contains(_filter) ? _filter : null;
    final visible = filter == null
        ? feed
        : feed.where((item) => item.type == filter).toList();
    final otherSides = _sync.unreadOnOtherSides;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Notifications'),
        backgroundColor: AppColors.background,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
        actions: [
          if (_sync.unread > 0)
            TextButton.icon(
              onPressed: _sync.markAllRead,
              icon: const Icon(Icons.done_all_rounded, size: 18),
              label: const Text('Mark all as read'),
              style: TextButton.styleFrom(
                foregroundColor: AppColors.primary,
                padding: const EdgeInsets.symmetric(horizontal: 12),
              ),
            ),
        ],
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
            child: NotificationSideBanner(
              activeRole: _sync.activeRole,
              otherSides: otherSides,
              onSwitch: (role) => NotificationHost.switchToSide(
                context,
                role.apiValue,
                openFeed: true,
              ),
            ),
          ),
          if (types.length > 1)
            NotificationFilterChips(
              types: types,
              selected: filter,
              onSelected: (type) => setState(() => _filter = type),
            ),
          Expanded(
            child: RefreshIndicator(
              onRefresh: _sync.refresh,
              child: visible.isEmpty
                  ? ListView(
                      children: const [
                        SizedBox(height: 160),
                        Center(
                          child: Text(
                            'No notifications yet.',
                            style: TextStyle(color: AppColors.textSecondary),
                          ),
                        ),
                      ],
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
                      itemCount: visible.length,
                      separatorBuilder: (_, index) =>
                          const SizedBox(height: 10),
                      itemBuilder: (context, index) {
                        final notification = visible[index];
                        return NotificationTile(
                          notification: notification,
                          onTap: () => _openNotification(notification),
                        );
                      },
                    ),
            ),
          ),
        ],
      ),
    );
  }
}
