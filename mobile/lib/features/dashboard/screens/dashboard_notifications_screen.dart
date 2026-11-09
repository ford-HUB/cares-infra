import 'package:flutter/material.dart';
import '../../../core/session/app_role.dart';
import '../../../core/theme/app_theme.dart';
import '../data/models/notification_models.dart';
import '../data/notification_sync.dart';
import '../presentation/widgets/notification_host.dart';
import '../widgets/notification_feed_widgets.dart';
import 'package:mobile/shared/widgets/empty_illustration.dart';
import 'package:mobile/shared/widgets/header_band.dart';

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
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _NotificationsHeader(
            sideLabel: _sync.activeRole?.label,
            canMarkAll: _sync.unread > 0,
            onMarkAll: _sync.markAllRead,
          ),
          const SizedBox(height: 14),
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
                      padding: const EdgeInsets.symmetric(horizontal: 32),
                      children: const [
                        SizedBox(height: 90),
                        EmptyStateBlock(
                          icon: Icons.notifications_off_outlined,
                          title: 'No Notifications Yet',
                          message:
                              'Event news, reminders and updates will show up here.',
                        ),
                      ],
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
                      itemCount: visible.length,
                      separatorBuilder: (_, index) =>
                          const SizedBox(height: 14),
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

/// Deep green band: back arrow, title, "Mark All as Read" pill, and which
/// side of the account the feed is showing.
class _NotificationsHeader extends StatelessWidget {
  const _NotificationsHeader({
    required this.sideLabel,
    required this.canMarkAll,
    required this.onMarkAll,
  });

  final String? sideLabel;
  final bool canMarkAll;
  final VoidCallback onMarkAll;

  @override
  Widget build(BuildContext context) {
    return HeaderBand.deep(
      padding: const EdgeInsets.fromLTRB(12, 8, 16, 22),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              IconButton(
                onPressed: () => Navigator.of(context).maybePop(),
                icon: const Icon(Icons.arrow_back_rounded, size: 28),
                color: Colors.white,
                tooltip: 'Back',
              ),
              const SizedBox(width: 6),
              const Expanded(
                child: Text(
                  'Notifications',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 26,
                    fontWeight: FontWeight.w800,
                    color: Colors.white,
                    letterSpacing: -0.3,
                  ),
                ),
              ),
              if (canMarkAll)
                FilledButton.icon(
                  onPressed: onMarkAll,
                  style: FilledButton.styleFrom(
                    backgroundColor: const Color(0xFF3E8E2E),
                    minimumSize: const Size(0, 44),
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    shape: const StadiumBorder(),
                    textStyle: const TextStyle(
                      fontSize: 14.5,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  icon: const Icon(Icons.check_rounded, size: 20),
                  label: const Text('Mark All as Read'),
                ),
            ],
          ),
          if (sideLabel != null) ...[
            const SizedBox(height: 10),
            Padding(
              padding: const EdgeInsets.only(left: 12),
              child: Row(
                children: [
                  const Icon(
                    Icons.notifications_active_outlined,
                    size: 22,
                    color: AppColors.navActive,
                  ),
                  const SizedBox(width: 10),
                  Text(
                    'Showing $sideLabel Updates',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: Colors.white.withValues(alpha: 0.95),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}
