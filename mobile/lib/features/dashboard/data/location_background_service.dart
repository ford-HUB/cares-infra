import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_foreground_task/flutter_foreground_task.dart';

import '../../../core/services/auth_session.dart';
import '../../../core/services/connectivity_monitor.dart';
import 'location_capture_db.dart';
import 'location_recorder.dart';

/// Snapshot of the recorder inside the service, mirrored to the app so its
/// screens can show what the background is doing.
class LocationServiceState {
  const LocationServiceState({
    required this.streaming,
    required this.locationBlocked,
    required this.live,
    required this.syncing,
    required this.captures,
    required this.liveSubmits,
    this.latitude,
    this.longitude,
    this.accuracyMeters,
    this.fixAt,
  });

  final bool streaming;
  final bool locationBlocked;
  final bool live;
  final bool syncing;
  final int captures;
  final int liveSubmits;
  final double? latitude;
  final double? longitude;
  final double? accuracyMeters;
  final DateTime? fixAt;

  static const _type = 'state';

  Map<String, Object?> toMessage() => {
    'type': _type,
    'streaming': streaming,
    'blocked': locationBlocked,
    'live': live,
    'syncing': syncing,
    'captures': captures,
    'liveSubmits': liveSubmits,
    'lat': latitude,
    'lng': longitude,
    'acc': accuracyMeters,
    'fixAt': fixAt?.millisecondsSinceEpoch,
  };

  static LocationServiceState? fromMessage(Object data) {
    if (data is! Map || data['type'] != _type) return null;
    final fixAt = data['fixAt'] as int?;
    return LocationServiceState(
      streaming: data['streaming'] == true,
      locationBlocked: data['blocked'] == true,
      live: data['live'] == true,
      syncing: data['syncing'] == true,
      captures: (data['captures'] as num?)?.toInt() ?? 0,
      liveSubmits: (data['liveSubmits'] as num?)?.toInt() ?? 0,
      latitude: (data['lat'] as num?)?.toDouble(),
      longitude: (data['lng'] as num?)?.toDouble(),
      accuracyMeters: (data['acc'] as num?)?.toDouble(),
      fixAt: fixAt == null ? null : DateTime.fromMillisecondsSinceEpoch(fixAt),
    );
  }
}

/// App-side handle on the Android foreground service that hosts the
/// recorder, so recording survives the app being swiped away, the screen
/// turning off, and (with battery optimisation off) a reboot.
///
/// Android only. The service isolate can't see the app's memory, so
/// everything it needs is either in SQLite (activated flag, email, joined
/// events) or pushed to it here (the access token, "events changed").
abstract final class LocationBackgroundService {
  static const int _serviceId = 4171;
  static const String notificationTitle = 'Recording your location';

  /// `tracker_state` key holding the signed-in email for the service.
  static const String emailStateKey = 'participant_email';

  static bool get isSupported =>
      !kIsWeb && defaultTargetPlatform == TargetPlatform.android;

  /// Call once at app start, on the main isolate, before [start].
  static void init() {
    if (!isSupported) return;
    FlutterForegroundTask.initCommunicationPort();
    FlutterForegroundTask.init(
      androidNotificationOptions: AndroidNotificationOptions(
        channelId: 'attendance_recording',
        channelName: 'Attendance recording',
        channelDescription:
            'Shown while CARES records your location for event attendance.',
        onlyAlertOnce: true,
        channelImportance: NotificationChannelImportance.LOW,
        priority: NotificationPriority.LOW,
      ),
      iosNotificationOptions: const IOSNotificationOptions(
        showNotification: false,
        playSound: false,
      ),
      foregroundTaskOptions: ForegroundTaskOptions(
        // The recorder keeps its own 1 s timer; this is just the periodic
        // re-check of the activated flag and joined events.
        eventAction: ForegroundTaskEventAction.repeat(60000),
        autoRunOnBoot: true,
        autoRunOnMyPackageReplaced: true,
        allowWakeLock: true,
        allowWifiLock: false,
      ),
    );
  }

  static Future<bool> get isRunning => isSupported
      ? FlutterForegroundTask.isRunningService
      : Future.value(false);

  static Future<bool> start() async {
    if (!isSupported) return false;
    if (await FlutterForegroundTask.isRunningService) return true;
    final result = await FlutterForegroundTask.startService(
      serviceId: _serviceId,
      serviceTypes: [ForegroundServiceTypes.location],
      notificationTitle: notificationTitle,
      notificationText: 'Starting…',
      callback: locationTaskCallback,
    );
    return result is ServiceRequestSuccess;
  }

  static Future<void> stop() async {
    if (!isSupported) return;
    if (await FlutterForegroundTask.isRunningService) {
      await FlutterForegroundTask.stopService();
    }
  }

  /// Hands the service the current access token so live posts can
  /// authenticate. Null clears it (signed out) — the service then records
  /// offline-style until the app signs in again.
  static void sendAccessToken(String? token) {
    if (!isSupported) return;
    FlutterForegroundTask.sendDataToTask({'type': 'token', 'value': token});
  }

  /// Tells the service the joined events in SQLite changed.
  static void notifyEventsChanged() {
    if (!isSupported) return;
    FlutterForegroundTask.sendDataToTask({'type': 'events'});
  }

  static void addStateListener(void Function(Object data) callback) {
    if (!isSupported) return;
    FlutterForegroundTask.addTaskDataCallback(callback);
  }

  static void removeStateListener(void Function(Object data) callback) {
    if (!isSupported) return;
    FlutterForegroundTask.removeTaskDataCallback(callback);
  }
}

@pragma('vm:entry-point')
void locationTaskCallback() {
  FlutterForegroundTask.setTaskHandler(LocationTaskHandler());
}

/// Runs on the service isolate. Owns a [LocationRecorder] for as long as the
/// persisted activated flag is on; when the flag goes off (the app verified
/// there is nothing left to record) the service stops itself.
class LocationTaskHandler extends TaskHandler {
  final _db = LocationCaptureDb.instance;
  final _connectivity = ConnectivityMonitor.instance;

  LocationRecorder? _recorder;
  bool? _wasOnline;
  DateTime? _notifiedAt;
  bool _stateQueued = false;

  @override
  Future<void> onStart(DateTime timestamp, TaskStarter starter) async {
    try {
      await dotenv.load(fileName: '.env');
    } catch (_) {}
    _connectivity.start();
    _connectivity.addListener(_onConnectivityChanged);
    await _evaluate();
  }

  @override
  void onRepeatEvent(DateTime timestamp) {
    unawaited(_evaluate());
  }

  @override
  Future<void> onDestroy(DateTime timestamp, bool isTimeout) async {
    _connectivity.removeListener(_onConnectivityChanged);
    _recorder?.stop();
    _recorder = null;
  }

  @override
  void onReceiveData(Object data) {
    if (data is! Map) return;
    switch (data['type']) {
      case 'token':
        AuthSession.setAccessToken(data['value'] as String?);
      case 'events':
        unawaited(_recorder?.reloadEvents() ?? _evaluate());
    }
  }

  @override
  void onNotificationPressed() => FlutterForegroundTask.launchApp();

  void _onConnectivityChanged() {
    final online = _connectivity.isOnline;
    if (online == true && _wasOnline != true) _recorder?.onBackOnline();
    _wasOnline = online;
    _publishState();
  }

  Future<void> _evaluate() async {
    final activated = await _db.readActivated();
    if (!activated) {
      _recorder?.stop();
      _recorder = null;
      await FlutterForegroundTask.stopService();
      return;
    }

    final email = await _db.readState(LocationBackgroundService.emailStateKey);
    if (email == null || email.isEmpty) {
      // Nothing to record against until the app signs in.
      await FlutterForegroundTask.updateService(
        notificationText: 'Waiting for sign-in…',
      );
      return;
    }

    var recorder = _recorder;
    if (recorder == null) {
      recorder = LocationRecorder(email: email, onChanged: _publishState);
      _recorder = recorder;
      await recorder.reloadEvents();
      if (_connectivity.isOnline == true) unawaited(recorder.syncPending());
    } else {
      recorder.email = email;
    }
    await recorder.start();
    _publishState(force: true);
  }

  /// Mirrors the recorder to the app (if it is listening) at most once a
  /// second, and refreshes the notification text every 30 s.
  void _publishState({bool force = false}) {
    if (!force) {
      if (_stateQueued) return;
      _stateQueued = true;
      Future<void>.delayed(const Duration(seconds: 1), () {
        _stateQueued = false;
        _publishState(force: true);
      });
      return;
    }
    final recorder = _recorder;
    final state = LocationServiceState(
      streaming: recorder?.isStreaming ?? false,
      locationBlocked: recorder?.isLocationBlocked ?? false,
      live: recorder?.isLive ?? false,
      syncing: recorder?.isSyncing ?? false,
      captures: recorder?.captures ?? 0,
      liveSubmits: recorder?.liveSubmits ?? 0,
      latitude: recorder?.lastFix?.latitude,
      longitude: recorder?.lastFix?.longitude,
      accuracyMeters: recorder?.lastFix?.accuracy,
      fixAt: recorder?.lastFixAt,
    );
    FlutterForegroundTask.sendDataToMain(state.toMessage());

    final now = DateTime.now();
    final last = _notifiedAt;
    if (last == null || now.difference(last) >= const Duration(seconds: 30)) {
      _notifiedAt = now;
      unawaited(
        FlutterForegroundTask.updateService(
          notificationText: _notificationText(state),
        ),
      );
    }
  }

  static String _notificationText(LocationServiceState state) {
    if (state.locationBlocked) return 'Location is off — nothing is recorded.';
    if (!state.streaming) return 'Waiting for GPS…';
    final mode = state.live ? 'sending live' : 'saved on device';
    return '${state.captures} coordinates captured · $mode';
  }
}
