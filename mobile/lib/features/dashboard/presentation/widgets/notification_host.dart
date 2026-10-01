import 'dart:async';

import 'package:flutter/material.dart';
import 'package:mobile/core/navigation/dashboard_router.dart';
import 'package:mobile/core/services/auth_session.dart';
import 'package:mobile/core/services/local_notifications.dart';
import 'package:mobile/core/session/role_account_store.dart';
import 'package:mobile/features/dashboard/data/notification_sync.dart';
import 'package:mobile/features/dashboard/screens/dashboard_notifications_screen.dart';

/// Wraps a signed-in dashboard — Volunteer, Donor or Beneficiary alike — and
/// keeps the notification feed alive while it is up: asks for permission
/// once, holds the [NotificationSync] poll open, re-reads on resume, and
/// routes taps on any device notification into the feed.
///
/// A pop that belongs to another side of the account carries that side in
/// its payload; tapping it switches to that side's dashboard first, so the
/// notification is on screen when the feed opens.
class NotificationHost extends StatefulWidget {
  const NotificationHost({super.key, required this.child});

  final Widget child;

  /// Opens [roleType]'s dashboard in place of the current one, landing on its
  /// notification feed when [openFeed]. Returns false — and does nothing —
  /// when that side is already open or not unlocked on this account.
  static bool switchToSide(
    BuildContext context,
    String roleType, {
    bool openFeed = false,
  }) {
    final store = RoleAccountStore.instance;
    final account = store.byType(roleType);
    if (account == null ||
        !account.isUnlocked ||
        store.active?.roleType == account.roleType) {
      return false;
    }
    store.activate(account.roleType);
    if (openFeed) {
      // The new side's dashboard gets its own host, which opens the feed
      // from the tap it is handed.
      LocalNotifications.instance.launchTap = const NotificationTap(
        payload: 'notifications',
      );
    }
    DashboardRouter.navigateToRoleDashboard(
      context,
      roleType: account.roleType,
      email: account.email,
      firstName: account.firstName,
      lastName: account.lastName,
    );
    return true;
  }

  @override
  State<NotificationHost> createState() => _NotificationHostState();
}

class _NotificationHostState extends State<NotificationHost>
    with WidgetsBindingObserver {
  StreamSubscription<NotificationTap>? _tapSubscription;
  bool _holdsPoll = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _startNotifications();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _tapSubscription?.cancel();
    if (_holdsPoll) NotificationSync.instance.stop();
    super.dispose();
  }

  /// Coming back from the background is the moment a ruling, decision or
  /// reminder most likely landed, so the feed is re-read right away rather
  /// than on the timer.
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      unawaited(NotificationSync.instance.refresh());
    }
  }

  /// Asks for permission once the dashboard is up (not on the login screen),
  /// starts the feed poll, and listens for taps.
  Future<void> _startNotifications() async {
    if (!AuthSession.isSignedIn) return;
    NotificationSync.instance.start();
    _holdsPoll = true;

    final notifier = LocalNotifications.instance;
    _tapSubscription = notifier.taps.listen(_onTap);
    await notifier.requestPermission();

    final launch = notifier.launchTap;
    if (launch != null && mounted) {
      notifier.launchTap = null;
      _onTap(launch);
    }
  }

  void _onTap(NotificationTap tap) {
    if (!mounted) return;
    final payload = tap.payload ?? '';
    if (payload.startsWith(NotificationSync.rolePayloadPrefix)) {
      final switched = NotificationHost.switchToSide(
        context,
        payload.substring(NotificationSync.rolePayloadPrefix.length),
        openFeed: true,
      );
      if (switched) return;
    }
    DashboardNotificationsScreen.open(context);
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
