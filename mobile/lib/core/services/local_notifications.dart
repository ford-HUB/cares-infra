import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:timezone/data/latest.dart' as tzdata;
import 'package:timezone/timezone.dart' as tz;

/// A notification the person tapped, handed to whoever owns navigation.
class NotificationTap {
  const NotificationTap({required this.payload});

  /// A route hint: the server's `href` for a feed row, or `event:<id>` for a
  /// scheduled reminder. Null when the tap carried nothing.
  final String? payload;
}

/// Device notifications — the only push channel the app has, since there is
/// no FCM in the project. Two uses: reminders scheduled on the device for
/// registered events, and immediate pops for feed rows the server wrote while
/// the app was away (attendance rulings, start reminders, certificates,
/// announcements).
///
/// Channels are split so a person can mute reminders without muting rulings.
class LocalNotifications {
  LocalNotifications._();

  static final LocalNotifications instance = LocalNotifications._();

  static const _remindersChannel = AndroidNotificationChannel(
    'event_reminders',
    'Event reminders',
    description: 'Reminders before events you registered for.',
    importance: Importance.high,
  );

  static const _feedChannel = AndroidNotificationChannel(
    'feed',
    'Updates',
    description:
        'Attendance results, certificates, announcements and other updates.',
    importance: Importance.defaultImportance,
  );

  final FlutterLocalNotificationsPlugin _plugin =
      FlutterLocalNotificationsPlugin();

  final StreamController<NotificationTap> _taps =
      StreamController<NotificationTap>.broadcast();

  /// Taps on any notification this service showed, while the app is running.
  Stream<NotificationTap> get taps => _taps.stream;

  /// The tap that launched a cold app, if any — read once by the app root.
  NotificationTap? launchTap;

  bool _initialized = false;

  Future<void> initialize() async {
    if (_initialized) return;
    _initialized = true;

    tzdata.initializeTimeZones();

    const settings = InitializationSettings(
      android: AndroidInitializationSettings('@mipmap/ic_launcher'),
      iOS: DarwinInitializationSettings(
        requestAlertPermission: false,
        requestBadgePermission: false,
        requestSoundPermission: false,
      ),
    );
    await _plugin.initialize(
      settings,
      onDidReceiveNotificationResponse: (response) =>
          _taps.add(NotificationTap(payload: response.payload)),
    );

    final launch = await _plugin.getNotificationAppLaunchDetails();
    if (launch?.didNotificationLaunchApp ?? false) {
      launchTap = NotificationTap(
        payload: launch!.notificationResponse?.payload,
      );
    }

    final android = _plugin
        .resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin
        >();
    await android?.createNotificationChannel(_remindersChannel);
    await android?.createNotificationChannel(_feedChannel);
  }

  /// Asks the OS for permission the first time it matters (Android 13+, iOS).
  /// Returns whether notifications may be shown.
  Future<bool> requestPermission() async {
    final android = _plugin
        .resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin
        >();
    if (android != null) {
      return await android.requestNotificationsPermission() ?? true;
    }
    final ios = _plugin
        .resolvePlatformSpecificImplementation<
          IOSFlutterLocalNotificationsPlugin
        >();
    if (ios != null) {
      return await ios.requestPermissions(
            alert: true,
            badge: true,
            sound: true,
          ) ??
          false;
    }
    return true;
  }

  /// Shows a notification now — a feed row that arrived while the app was away.
  Future<void> show({
    required int id,
    required String title,
    required String body,
    String? payload,
    bool attention = false,
  }) async {
    try {
      await _plugin.show(
        id,
        title,
        body,
        NotificationDetails(
          android: AndroidNotificationDetails(
            _feedChannel.id,
            _feedChannel.name,
            channelDescription: _feedChannel.description,
            importance: attention
                ? Importance.high
                : Importance.defaultImportance,
            priority: attention ? Priority.high : Priority.defaultPriority,
            styleInformation: BigTextStyleInformation(body),
          ),
          iOS: const DarwinNotificationDetails(),
        ),
        payload: payload,
      );
    } catch (error) {
      debugPrint('notification show failed: $error');
    }
  }

  /// Schedules a reminder for a moment in the future; a past moment is skipped.
  /// Re-scheduling with the same [id] replaces the earlier one, so callers can
  /// re-arm idempotently. Inexact delivery keeps the app clear of the exact-alarm
  /// permission — a reminder a minute or two late is still a reminder.
  Future<void> schedule({
    required int id,
    required DateTime at,
    required String title,
    required String body,
    String? payload,
  }) async {
    if (!at.isAfter(DateTime.now())) return;
    try {
      await _plugin.zonedSchedule(
        id,
        title,
        body,
        tz.TZDateTime.from(at.toUtc(), tz.UTC),
        NotificationDetails(
          android: AndroidNotificationDetails(
            _remindersChannel.id,
            _remindersChannel.name,
            channelDescription: _remindersChannel.description,
            importance: Importance.high,
            priority: Priority.high,
            styleInformation: BigTextStyleInformation(body),
          ),
          iOS: const DarwinNotificationDetails(),
        ),
        androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
        payload: payload,
      );
    } catch (error) {
      debugPrint('notification schedule failed: $error');
    }
  }

  Future<void> cancel(int id) => _plugin.cancel(id);

  /// Everything pending — used on sign-out so a stale reminder never fires for
  /// the wrong account.
  Future<void> cancelAll() => _plugin.cancelAll();
}
