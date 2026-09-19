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

/// Where the recorder stands for one joined event, as shown on the sync sheet.
enum EventTrackingState {
  /// Recording is on and fixes are being written every second.
  recording,

  /// Recording should be on but location is off / denied.
  blocked,

  /// Recording is off — no joined upcoming event on record.
  inactive,

  /// This event is over; whatever was captured awaits sync.
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

/// Decides *whether* the volunteer's coordinates should be recorded, and
/// keeps a [LocationRecorder] running for as long as they should — for the
/// attendance data-cleaning microservice to match against the events they
/// registered for.
///
/// Recording is a persisted **activated** flag, not an event window:
///
/// * It turns **on** as soon as the volunteer has any joined upcoming event.
/// * It turns **off** only when the device is online *and* the check finds
///   no joined upcoming event left — the server can then be trusted.
/// * Offline (or before the first connectivity probe) the flag is left as it
///   was: the app can't verify anything, so it keeps saving. The flag lives in
///   SQLite so a restart while offline keeps recording too.
///
/// Where the recorder actually runs:
///
/// * **Android** — inside the foreground service
///   ([LocationBackgroundService]), so recording survives the app being
///   swiped away or the screen turning off. This class just starts/stops the
///   service and mirrors its state for the UI.
/// * **Elsewhere** — in-process, foreground only: the stream lives as long
///   as the app process does.
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

  /// The persisted flag: coordinates should be saved.
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

  /// An automatic upload of pending rows is running.
  bool get isSyncing => _usesService
      ? (_serviceState?.syncing ?? false)
      : (_recorder?.isSyncing ?? false);

  /// Fixes handled since recording started — cheap live counter for the UI.
  int get capturesThisSession => _usesService
      ? (_serviceState?.captures ?? 0)
      : (_recorder?.captures ?? 0);

  /// Of those, the ones that went straight to the server.
  int get liveSubmitsThisSession => _usesService
      ? (_serviceState?.liveSubmits ?? 0)
      : (_recorder?.liveSubmits ?? 0);

  DateTime? get lastFixAt =>
      _usesService ? _serviceState?.fixAt : _recorder?.lastFixAt;

  /// Joined events that haven't ended yet, soonest first.
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

  /// Idempotent. Call once at app start; safe to call again after a join.
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

  /// Re-check now (e.g. right after joining an event).
  void refresh() => _evaluate();

  /// Uploads every pending row now. Runs by itself when the connection comes
  /// back; also safe to call from a "Sync" button.
  Future<void> syncPending() async {
    final recorder = _recorder;
    if (recorder != null) return recorder.syncPending();
    // Android: the service owns the recorder; an ad-hoc one just for the
    // upload is fine — it never starts a stream.
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
