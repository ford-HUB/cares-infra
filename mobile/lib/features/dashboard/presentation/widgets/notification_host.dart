import 'dart:async';

import 'package:flutter/material.dart';
import 'package:mobile/core/navigation/dashboard_router.dart';
import 'package:mobile/core/services/auth_session.dart';
import 'package:mobile/core/services/local_notifications.dart';
import 'package:mobile/core/session/role_account_store.dart';
import 'package:mobile/features/dashboard/data/notification_sync.dart';
import 'package:mobile/features/dashboard/screens/dashboard_notifications_screen.dart';

/// Keeps the feed alive while a dashboard is up: asks permission once, holds
/// the [NotificationSync] poll, re-reads on resume and routes taps. A pop for
/// another side switches to that side's dashboard first.
class NotificationHost extends StatefulWidget {
  const NotificationHost({super.key, required this.child});

  final Widget child;

  /// Lands on the feed when [openFeed]. False (no-op) when that side is already
  /// open or not unlocked.
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
      // The new dashboard's own host opens the feed from this tap.
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

  /// Re-read on resume, when news most likely landed, instead of waiting for
  /// the timer.
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      unawaited(NotificationSync.instance.refresh());
    }
  }

  /// Asks permission once the dashboard is up, not on login.
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
