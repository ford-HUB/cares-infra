import 'dart:async';

import 'package:flutter/foundation.dart';

import '../../../core/services/auth_session.dart';
import '../../../core/services/connectivity_monitor.dart';
import '../../../core/session/static_user_session.dart';
import '../domain/cares_event.dart';
import 'event_registration_store.dart';
import 'location_background_service.dart';
import 'location_capture_db.dart';
import 'location_recorder.dart';

enum EventTrackingState {
  /// Fixes written every second.
  recording,

  /// Should record, but location is off or denied.
  blocked,

  /// No joined upcoming event.
  inactive,

  /// Event over; captures await sync.
  ended,
}

extension EventTrackingStateX on EventTrackingState {
  String get label => switch (this) {
    EventTrackingState.recording => 'Recording',
    EventTrackingState.blocked => 'Location off',
    EventTrackingState.inactive => 'Inactive',
    EventTrackingState.ended => 'Ended',
  };
}

/// Keeps a [LocationRecorder] running for the attendance data-cleaning
/// microservice. Recording is a persisted activated flag: on with any joined
/// upcoming event; off only when online and none remain; offline it is left as
/// is (SQLite-backed, survives restarts).
///
/// Android runs it in the foreground service ([LocationBackgroundService]) so
/// it survives swipe-away; elsewhere it is in-process, foreground only.
class EventLocationTracker extends ChangeNotifier {
  EventLocationTracker._();

  static final EventLocationTracker instance = EventLocationTracker._();

  static const Duration evaluateEvery = Duration(minutes: 1);

  final _store = EventRegistrationStore.instance;
  final _connectivity = ConnectivityMonitor.instance;
  final _db = LocationCaptureDb.instance;

  Timer? _ticker;
  bool _started = false;
  bool _activated = false;
  bool? _wasOnline;

  /// Non-Android: the in-process recorder.
  LocationRecorder? _recorder;

  /// Android: the last snapshot the service sent.
  LocationServiceState? _serviceState;
  bool _serviceRunning = false;

  bool get _usesService => LocationBackgroundService.isSupported;

  bool get isActivated => _activated;

  /// The flag is on and the stream is actually delivering.
  bool get isRecording =>
      _activated &&
      (_usesService
          ? (_serviceState?.streaming ?? false)
          : (_recorder?.isStreaming ?? false));

  bool get isLocationBlocked => _usesService
      ? (_serviceState?.locationBlocked ?? false)
      : (_recorder?.isLocationBlocked ?? false);

  /// True while fixes are going to the server live rather than into SQLite.
  bool get isLive => _usesService
      ? (_serviceState?.live ?? false)
      : (_recorder?.isLive ?? false);

  bool get isSyncing => _usesService
      ? (_serviceState?.syncing ?? false)
      : (_recorder?.isSyncing ?? false);

  int get capturesThisSession => _usesService
      ? (_serviceState?.captures ?? 0)
      : (_recorder?.captures ?? 0);

  int get liveSubmitsThisSession => _usesService
      ? (_serviceState?.liveSubmits ?? 0)
      : (_recorder?.liveSubmits ?? 0);

  DateTime? get lastFixAt =>
      _usesService ? _serviceState?.fixAt : _recorder?.lastFixAt;

  List<CaresEvent> get upcomingJoinedEvents {
    final now = DateTime.now();
    final events = [
      for (final p in _store.participationsForEmail(_email))
        if (!p.event.isCompleted && now.isBefore(p.event.endsAt)) p.event,
    ]..sort((a, b) => a.startsAt.compareTo(b.startsAt));
    return events;
  }

  String get _email =>
      StaticUserSession.instance.currentUser?.email ?? 'guest@cares.local';

  /// Idempotent; safe to call again after a join.
  void start() {
    if (_started) return;
    _started = true;
    LocationBackgroundService.init();
    LocationBackgroundService.addStateListener(_onServiceData);
    _connectivity.start();
    _store.addListener(_onRegistrationsChanged);
    _connectivity.addListener(_onConnectivityChanged);
    _ticker = Timer.periodic(evaluateEvery, (_) => _evaluate());
    unawaited(_db.purgeExpired());
    unawaited(_restore());
  }

  Future<void> _restore() async {
    _activated = await _db.readActivated();
    if (_usesService) {
      _serviceRunning = await LocationBackgroundService.isRunning;
    }
    await _evaluate();
  }

  void stop() {
    _ticker?.cancel();
    _ticker = null;
    _store.removeListener(_onRegistrationsChanged);
    _connectivity.removeListener(_onConnectivityChanged);
    LocationBackgroundService.removeStateListener(_onServiceData);
    _started = false;
    _recorder?.stop();
    _recorder = null;
    notifyListeners();
  }

  void refresh() => _evaluate();

  /// Runs itself on reconnect; also safe from a "Sync" button.
  Future<void> syncPending() async {
    final recorder = _recorder;
    if (recorder != null) return recorder.syncPending();
    // Android: the service owns the recorder; an ad-hoc one never starts a
    // stream.
    await LocationRecorder(email: _email).syncPending();
  }

  EventTrackingState stateFor(CaresEvent event, {DateTime? now}) {
    final at = now ?? DateTime.now();
    if (event.isCompleted || !at.isBefore(event.endsAt)) {
      return EventTrackingState.ended;
    }
    if (!_activated) return EventTrackingState.inactive;
    return isRecording
        ? EventTrackingState.recording
        : EventTrackingState.blocked;
  }

  void _onRegistrationsChanged() {
    LocationBackgroundService.notifyEventsChanged();
    unawaited(_recorder?.reloadEvents());
    unawaited(_evaluate());
  }

  void _onConnectivityChanged() {
    final online = _connectivity.isOnline;
    if (online == true && _wasOnline != true) _recorder?.onBackOnline();
    _wasOnline = online;
    unawaited(_evaluate());
  }

  void _onServiceData(Object data) {
    final state = LocationServiceState.fromMessage(data);
    if (state == null) return;
    _serviceState = state;
    _serviceRunning = true;
    notifyListeners();
  }

  Future<void> _evaluate() async {
    final hasUpcoming = upcomingJoinedEvents.isNotEmpty;
    final online = _connectivity.isOnline == true;

    final wasActivated = _activated;
    if (hasUpcoming) {
      // Joining is local knowledge — enough to switch on, even offline.
      _activated = true;
    } else if (online) {
      // Only a verified check may switch it off.
      _activated = false;
    }
    if (_activated != wasActivated) {
      await _db.writeActivated(_activated);
    }

    if (_usesService) {
      await _driveService();
    } else {
      await _driveRecorder();
    }
    if (_activated != wasActivated) notifyListeners();
  }

  Future<void> _driveService() async {
    // The service can't read the session, so both live in SQLite / messages.
    await _db.writeState(LocationBackgroundService.emailStateKey, _email);
    if (!_activated) {
      if (_serviceRunning) {
        await LocationBackgroundService.stop();
        _serviceRunning = false;
        _serviceState = null;
        notifyListeners();
      }
      return;
    }
    if (!_serviceRunning) {
      _serviceRunning = await LocationBackgroundService.start();
    }
    LocationBackgroundService.sendAccessToken(AuthSession.accessToken);
  }

  Future<void> _driveRecorder() async {
    if (!_activated) {
      _recorder?.stop();
      _recorder = null;
      return;
    }
    var recorder = _recorder;
    if (recorder == null) {
      recorder = LocationRecorder(email: _email, onChanged: notifyListeners);
      _recorder = recorder;
      await recorder.reloadEvents();
      if (_connectivity.isOnline == true) unawaited(recorder.syncPending());
    } else {
      recorder.email = _email;
    }
    await recorder.start();
  }
}
