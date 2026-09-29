import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/core/services/auth_session.dart';
import 'package:mobile/core/services/local_notifications.dart';
import 'package:mobile/features/dashboard/data/models/notification_models.dart';
import 'package:mobile/features/dashboard/data/notification_service.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Keeps the person's feed current and turns rows that arrived while the app
/// was away into device notifications. There is no push channel, so this
/// polls: on every dashboard resume and refresh, and on a slow timer while the
/// app is in the foreground.
///
/// The first fetch after sign-in only records a high-water mark — a backlog
/// of old rows must not pop all at once on a fresh install.
class NotificationSync extends ChangeNotifier {
  NotificationSync._();

  static final NotificationSync instance = NotificationSync._();

  static const Duration pollInterval = Duration(minutes: 2);

  /// Past this many new rows, one summary pop replaces the individual ones.
  static const int maxIndividualPops = 3;

  static const _seenKey = 'notifications.seen_at';

  /// Feed pops live above bit 30 so they never collide with the reminder ids
  /// (`EventReminderScheduler`), which stay below 2^29.
  static int _popId(String notificationId) =>
      (notificationId.hashCode & 0x0FFFFFFF) | 0x40000000;

  final NotificationService _service = NotificationService();

  NotificationFeed _feed = NotificationFeed.empty;
  Timer? _timer;
  bool _refreshing = false;

  NotificationFeed get feed => _feed;
  int get unread => _feed.unread;

  /// Starts the foreground poll. Safe to call repeatedly.
  void start() {
    _timer ??= Timer.periodic(pollInterval, (_) => refresh());
    unawaited(refresh());
  }

  void stop() {
    _timer?.cancel();
    _timer = null;
  }

  /// Fetches the feed and pops anything newer than the last mark. A network
  /// failure leaves the last good feed in place; the next tick retries.
  Future<void> refresh() async {
    if (!AuthSession.isSignedIn || _refreshing) return;
    _refreshing = true;
    try {
      final feed = await _service.fetchFeed();
      await _popNew(feed);
      _feed = feed;
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
    _feed = NotificationFeed(
      unread: (_feed.unread - 1).clamp(0, _feed.unread),
      items: [
        for (final item in _feed.items)
          item.id == id ? item.copyWith(isUnread: false) : item,
      ],
    );
    notifyListeners();
    try {
      _feed = await _service.markRead(id);
      notifyListeners();
    } catch (error) {
      debugPrint('mark read failed: $error');
    }
  }

  Future<void> markAllRead() async {
    _feed = NotificationFeed(
      unread: 0,
      items: [for (final item in _feed.items) item.copyWith(isUnread: false)],
    );
    notifyListeners();
    try {
      _feed = await _service.markAllRead();
      notifyListeners();
    } catch (error) {
      debugPrint('mark all read failed: $error');
    }
  }

  /// Forgets the feed and the high-water mark — sign-out, so the next account
  /// on this device starts clean.
  Future<void> clear() async {
    stop();
    _feed = NotificationFeed.empty;
    notifyListeners();
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_seenKey);
    } catch (_) {
      // Preferences unavailable; the mark simply survives to the next login.
    }
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
        .where((item) => item.isUnread && item.createdAt.isAfter(seenAt))
        .toList();
    if (fresh.isEmpty) return;

    if (latest != null) {
      await prefs.setString(_seenKey, latest.toIso8601String());
    }

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
      await notifier.show(
        id: _popId(item.id),
        title: item.title,
        body: item.message,
        payload: item.href ?? 'notifications',
        attention: item.attention,
      );
    }
  }
}
