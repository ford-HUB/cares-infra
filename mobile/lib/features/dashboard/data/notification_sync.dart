import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/core/services/auth_session.dart';
import 'package:mobile/core/services/local_notifications.dart';
import 'package:mobile/core/session/app_role.dart';
import 'package:mobile/core/session/role_account_store.dart';
import 'package:mobile/features/dashboard/data/models/notification_models.dart';
import 'package:mobile/features/dashboard/data/notification_service.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// No push channel, so this polls: on dashboard resume/refresh, shortly after
/// actions, and on a slow foreground timer. Screens see the open side only;
/// device pops cover every side. The first fetch after sign-in only records a
/// high-water mark so a backlog never pops at once.
class NotificationSync extends ChangeNotifier {
  NotificationSync._() {
    // Switching sides re-scopes the feed and the bell without a refetch.
    RoleAccountStore.instance.addListener(notifyListeners);
  }

  static final NotificationSync instance = NotificationSync._();

  static const Duration pollInterval = Duration(minutes: 1);

  /// The server writes notices on a background worker, so an immediate read
  /// would miss them.
  static const Duration actionFollowUp = Duration(seconds: 4);

  /// Past this many new rows, one summary pop replaces the individual ones.
  static const int maxIndividualPops = 3;

  /// The shell switches to that side before opening the feed.
  static const String rolePayloadPrefix = 'role:';

  static const _seenKey = 'notifications.seen_at';

  /// Feed pops live above bit 30 so they never collide with the reminder ids
  /// (`EventReminderScheduler`), which stay below 2^29.
  static int _popId(String notificationId) =>
      (notificationId.hashCode & 0x0FFFFFFF) | 0x40000000;

  final NotificationService _service = NotificationService();

  NotificationFeed _all = NotificationFeed.empty;
  Timer? _timer;
  Timer? _followUp;
  bool _refreshing = false;

  /// A side switch pushes the new dashboard before disposing the old, so the
  /// poll must outlive one [stop].
  int _holders = 0;

  /// Null before any dashboard signed in; the feed is then shown whole.
  AppRole? get activeRole {
    final type = RoleAccountStore.instance.active?.roleType;
    return type == null ? null : AppRoleX.fromApiValue(type);
  }

  bool _onOpenSide(AppNotification item) {
    final role = activeRole;
    return role == null || item.isFor(role);
  }

  bool _holds(AppRole role) {
    final store = RoleAccountStore.instance;
    return store.isEmpty || store.isUnlocked(role.apiValue);
  }

  List<AppNotification> get feed => _all.items.where(_onOpenSide).toList();

  /// Drives the bell dot and "Mark all".
  int get unread =>
      _all.items.where((item) => item.isUnread && _onOpenSide(item)).length;

  Map<AppRole, int> get unreadOnOtherSides {
    final counts = <AppRole, int>{};
    for (final item in _all.items) {
      final role = item.audienceRole;
      if (!item.isUnread || role == null || _onOpenSide(item)) continue;
      if (!_holds(role)) continue;
      counts[role] = (counts[role] ?? 0) + 1;
    }
    return counts;
  }

  /// Pair with [stop].
  void start() {
    _holders++;
    _timer ??= Timer.periodic(pollInterval, (_) => refresh());
    unawaited(refresh());
  }

  void stop() {
    if (_holders > 0) _holders--;
    if (_holders > 0) return;
    _cancelTimers();
  }

  void _cancelTimers() {
    _timer?.cancel();
    _timer = null;
    _followUp?.cancel();
    _followUp = null;
  }

  /// Repeated calls after an action collapse into one read.
  void refreshSoon() {
    _followUp?.cancel();
    _followUp = Timer(actionFollowUp, () {
      _followUp = null;
      unawaited(refresh());
    });
  }

  /// A network failure keeps the last good feed; the next tick retries.
  Future<void> refresh() async {
    if (!AuthSession.isSignedIn || _refreshing) return;
    _refreshing = true;
    try {
      final feed = await _service.fetchFeed();
      await _popNew(feed);
      _all = feed;
      notifyListeners();
    } on ApiException catch (error) {
      debugPrint('notification refresh failed: ${error.message}');
    } catch (error) {
      debugPrint('notification refresh failed: $error');
    } finally {
      _refreshing = false;
    }
  }

  Future<void> markRead(String id) async {
    // Optimistic so the row settles instantly; the server answer replaces it.
    _all = NotificationFeed(
      unread: (_all.unread - 1).clamp(0, _all.unread),
      items: [
        for (final item in _all.items)
          item.id == id ? item.copyWith(isUnread: false) : item,
      ],
    );
    notifyListeners();
    try {
      _all = await _service.markRead(id);
      notifyListeners();
    } catch (error) {
      debugPrint('mark read failed: $error');
    }
  }

  /// Open side only; other sides' news is still unseen.
  Future<void> markAllRead() async {
    final role = activeRole ?? AppRole.volunteer;
    _all = NotificationFeed(
      unread: _all.unread,
      items: [
        for (final item in _all.items)
          item.isFor(role) ? item.copyWith(isUnread: false) : item,
      ],
    );
    notifyListeners();
    try {
      _all = await _service.markAllRead(roleType: role.apiValue);
      notifyListeners();
    } catch (error) {
      debugPrint('mark all read failed: $error');
    }
  }

  /// On sign-out, so the next account starts clean.
  Future<void> clear() async {
    _holders = 0;
    _cancelTimers();
    _all = NotificationFeed.empty;
    notifyListeners();
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_seenKey);
    } catch (_) {
      // Preferences unavailable; the mark simply survives to the next login.
    }
  }

  /// Account-wide rows always; side rows only for sides the account holds.
  bool _poppable(AppNotification item) {
    final role = item.audienceRole;
    return role == null || _holds(role);
  }

  Future<void> _popNew(NotificationFeed feed) async {
    SharedPreferences prefs;
    try {
      prefs = await SharedPreferences.getInstance();
    } catch (_) {
      return;
    }

    final latest = feed.items.isEmpty
        ? null
        : feed.items
              .map((item) => item.createdAt)
              .reduce((a, b) => a.isAfter(b) ? a : b);
    final seenRaw = prefs.getString(_seenKey);

    if (seenRaw == null) {
      // First look at this account's feed: mark, don't pop the backlog.
      await prefs.setString(
        _seenKey,
        (latest ?? DateTime.now()).toIso8601String(),
      );
      return;
    }

    final seenAt = DateTime.tryParse(seenRaw) ?? DateTime.now();
    final fresh = feed.items
        .where(
          (item) =>
              item.isUnread &&
              item.createdAt.isAfter(seenAt) &&
              _poppable(item),
        )
        .toList();

    if (latest != null && latest.isAfter(seenAt)) {
      await prefs.setString(_seenKey, latest.toIso8601String());
    }
    if (fresh.isEmpty) return;

    final notifier = LocalNotifications.instance;
    if (fresh.length > maxIndividualPops) {
      await notifier.show(
        id: _popId(fresh.first.id),
        title: '${fresh.length} new updates',
        body: fresh.map((item) => item.title).take(4).join(' · '),
        payload: 'notifications',
        attention: fresh.any((item) => item.attention),
      );
      return;
    }
    for (final item in fresh) {
      final role = item.audienceRole;
      final otherSide = role != null && !_onOpenSide(item);
      await notifier.show(
        id: _popId(item.id),
        // Prefix other sides so a pop isn't mistaken for the open side's.
        title: otherSide ? '${role.label} · ${item.title}' : item.title,
        body: item.message,
        payload: otherSide
            ? '$rolePayloadPrefix${role.apiValue}'
            : item.href ?? 'notifications',
        attention: item.attention,
      );
    }
  }
}
