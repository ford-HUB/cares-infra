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

/// Keeps the person's feed current and turns rows that arrived while the app
/// was away into device notifications. There is no push channel, so this
/// polls: on every dashboard resume and refresh, shortly after the person does
/// something the server answers with a notice, and on a slow timer while the
/// app is in the foreground.
///
/// The server feed covers every side of the account. What the screens read
/// ([feed], [unread]) is scoped to the side that is open — a donor who also
/// volunteers never sees donation news on the Volunteer side — while device
/// pops cover every side the account holds, so nothing is missed just because
/// another side was open when it landed.
///
/// The first fetch after sign-in only records a high-water mark — a backlog
/// of old rows must not pop all at once on a fresh install.
class NotificationSync extends ChangeNotifier {
  NotificationSync._() {
    // Switching sides re-scopes the feed and the bell without a refetch.
    RoleAccountStore.instance.addListener(notifyListeners);
  }

  static final NotificationSync instance = NotificationSync._();

  static const Duration pollInterval = Duration(minutes: 1);

  /// How long after a user action the feed is re-read. The server writes
  /// notices on a background worker, so an immediate read would miss them.
  static const Duration actionFollowUp = Duration(seconds: 4);

  /// Past this many new rows, one summary pop replaces the individual ones.
  static const int maxIndividualPops = 3;

  /// Tap payload for a pop that belongs to a side other than the open one;
  /// the dashboard shell switches to that side before opening the feed.
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

  /// Dashboards currently holding the poll open. A side switch pushes the new
  /// dashboard before the old one is disposed, so the poll must outlive a
  /// single [stop].
  int _holders = 0;

  /// The side the app has open, or null before any dashboard signed in (the
  /// feed is then shown whole).
  AppRole? get activeRole {
    final type = RoleAccountStore.instance.active?.roleType;
    return type == null ? null : AppRoleX.fromApiValue(type);
  }

  bool _onOpenSide(AppNotification item) {
    final role = activeRole;
    return role == null || item.isFor(role);
  }

  /// Whether the account can open [role]'s side at all.
  bool _holds(AppRole role) {
    final store = RoleAccountStore.instance;
    return store.isEmpty || store.isUnlocked(role.apiValue);
  }

  /// The open side's rows plus the account-wide ones, newest first.
  List<AppNotification> get feed => _all.items.where(_onOpenSide).toList();

  /// Unread on the open side — what the bell dot and "Mark all" follow.
  int get unread =>
      _all.items.where((item) => item.isUnread && _onOpenSide(item)).length;

  /// Unread rows waiting on the account's other sides, by side.
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

  /// Starts the foreground poll for one dashboard. Pair with [stop].
  void start() {
    _holders++;
    _timer ??= Timer.periodic(pollInterval, (_) => refresh());
    unawaited(refresh());
  }

  /// Releases one dashboard's hold; the poll ends when the last one goes.
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

  /// Re-reads the feed shortly after the person registered, applied, donated
  /// or filed a ticket, so the server's receipt pops without waiting a full
  /// poll. Repeated calls collapse into one read.
  void refreshSoon() {
    _followUp?.cancel();
    _followUp = Timer(actionFollowUp, () {
      _followUp = null;
      unawaited(refresh());
    });
  }

  /// Fetches the feed and pops anything newer than the last mark. A network
  /// failure leaves the last good feed in place; the next tick retries.
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

  /// Clears the open side only — the other sides' news has not been seen.
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

  /// Forgets the feed and the high-water mark — sign-out, so the next account
  /// on this device starts clean.
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

  /// A row pops only when it belongs to this account's sides: account-wide
  /// rows always, side rows only for a side the account actually holds.
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
        // Name the side when it is not the open one, so "Payment received"
        // is not mistaken for something on the side the person is looking at.
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
