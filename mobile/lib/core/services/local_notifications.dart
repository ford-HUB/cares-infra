import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:timezone/data/latest.dart' as tzdata;
import 'package:timezone/timezone.dart' as tz;

class NotificationTap {
  const NotificationTap({required this.payload});

  /// Server `href` for a feed row, or `event:<id>` for a reminder.
  final String? payload;
}

/// The only push channel (no FCM): event reminders and feed rows missed while
/// away. Separate channels let reminders be muted alone.
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

  Stream<NotificationTap> get taps => _taps.stream;

  /// Read once by the app root.
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

  /// Android 13+ / iOS.
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

  /// Same [id] replaces the earlier one; inexact delivery avoids the
  /// exact-alarm permission.
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

  /// Used on sign-out so a stale reminder never fires for the wrong account.
  Future<void> cancelAll() => _plugin.cancelAll();
}
