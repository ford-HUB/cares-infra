import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';

import '../../../core/services/connectivity_monitor.dart';
import '../../../core/session/static_user_session.dart';
import '../domain/cares_event.dart';
import '../domain/location_records.dart';
import '../utils/geo_utils.dart';
import 'event_registration_store.dart';
import 'location_capture_db.dart';
import 'location_csv_store.dart';

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

/// Records the volunteer's coordinates once a second into SQLite and the
/// day's CSV, for the attendance data-cleaning microservice to match against
/// the events they registered for.
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
/// Every row carries the id of the joined event most likely running (open
/// window first, else the next one to start) as a hint; the microservice is
/// free to re-assign rows from the coordinates. Foreground only: the stream
/// lives as long as the app process does.
class EventLocationTracker extends ChangeNotifier {
  EventLocationTracker._();

  static final EventLocationTracker instance = EventLocationTracker._();

  static const Duration evaluateEvery = Duration(minutes: 1);

  /// A fix older than this is not re-written by the timer — the device has
  /// stopped delivering positions (e.g. GPS lost indoors). A standing-still
  /// phone still refreshes well inside this, so it keeps being recorded.
  static const Duration staleFixAfter = Duration(seconds: 30);

  /// Written when the flag is on but no joined event is known locally
  /// (e.g. restarted offline with the in-memory registrations gone).
  static const String unassignedEventId = 'unassigned';
  static const String unassignedEventTitle = 'Awaiting event match';

  final _store = EventRegistrationStore.instance;
  final _connectivity = ConnectivityMonitor.instance;
  final _db = LocationCaptureDb.instance;
  final _csv = LocationCsvStore.instance;

  Timer? _ticker;
  Timer? _captureTimer;
  StreamSubscription<Position>? _positions;
  bool _started = false;
  bool _activated = false;
  bool _locationBlocked = false;

  Position? _lastFix;
  DateTime? _lastFixAt;
  int _capturesThisSession = 0;

  Position? get lastFix => _lastFix;
  DateTime? get lastFixAt => _lastFixAt;

  /// The persisted flag: coordinates should be saved.
  bool get isActivated => _activated;

  /// The flag is on and the stream is actually delivering.
  bool get isRecording => _activated && _positions != null;

  bool get isLocationBlocked => _locationBlocked;

  /// Rows written since the app started — cheap live counter for the UI.
  int get capturesThisSession => _capturesThisSession;

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
    _connectivity.start();
    _store.addListener(_evaluate);
    _connectivity.addListener(_evaluate);
    _ticker = Timer.periodic(evaluateEvery, (_) => _evaluate());
    unawaited(_db.purgeExpired());
    unawaited(_restore());
  }

  Future<void> _restore() async {
    _activated = await _db.readActivated();
    await _evaluate();
  }

  void stop() {
    _ticker?.cancel();
    _ticker = null;
    _store.removeListener(_evaluate);
    _connectivity.removeListener(_evaluate);
    _started = false;
    _stopStream();
    notifyListeners();
  }

  /// Re-check now (e.g. right after joining an event).
  void refresh() => _evaluate();

  EventTrackingState stateFor(CaresEvent event, {DateTime? now}) {
    final at = now ?? DateTime.now();
    if (event.isCompleted || !at.isBefore(event.endsAt)) {
      return EventTrackingState.ended;
    }
    if (!_activated) return EventTrackingState.inactive;
    return _positions != null
        ? EventTrackingState.recording
        : EventTrackingState.blocked;
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
      unawaited(_db.writeActivated(_activated));
    }

    if (!_activated) {
      _stopStream();
    } else if (_positions == null) {
      await _startStream();
    }
    if (_activated != wasActivated) notifyListeners();
  }

  Future<void> _startStream() async {
    if (_positions != null) return;
    if (!await _canTrack()) {
      _locationBlocked = true;
      notifyListeners();
      return;
    }
    _locationBlocked = false;
    _positions = Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.best,
        distanceFilter: 0,
      ),
    ).listen(_onPosition, onError: (Object _) => _stopStream());
    // Seed the first fix right away instead of waiting on the stream.
    unawaited(_seedFirstFix());
    _captureTimer = Timer.periodic(
      LocationRecords.captureInterval,
      (_) => _writeTick(),
    );
    notifyListeners();
  }

  Future<void> _seedFirstFix() async {
    if (_lastFix != null) return;
    try {
      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.best,
        ),
      );
      if (_lastFix == null) _onPosition(position);
    } catch (_) {}
  }

  void _stopStream() {
    _positions?.cancel();
    _positions = null;
    _captureTimer?.cancel();
    _captureTimer = null;
  }

  Future<bool> _canTrack() async {
    try {
      if (!await Geolocator.isLocationServiceEnabled()) return false;
      final permission = await Geolocator.checkPermission();
      return permission == LocationPermission.always ||
          permission == LocationPermission.whileInUse;
    } catch (_) {
      return false;
    }
  }

  void _onPosition(Position position) {
    _lastFix = position;
    _lastFixAt = DateTime.now();
  }

  /// The joined event a row is most likely for: one whose window is open,
  /// else the next to start. Null when none is known locally.
  CaresEvent? _hintEvent(DateTime now) {
    final joined = upcomingJoinedEvents;
    if (joined.isEmpty) return null;
    for (final event in joined) {
      if (event.isTrackingWindowOpen(now)) return event;
    }
    return joined.first;
  }

  /// One-second tick: write the latest fix as one row.
  Future<void> _writeTick() async {
    final position = _lastFix;
    final fixAt = _lastFixAt;
    if (position == null || fixAt == null || !_activated) return;
    if (DateTime.now().difference(fixAt) > staleFixAfter) return;

    final capturedAt = DateTime.now();
    final event = _hintEvent(capturedAt);
    var inArea = false;
    if (event != null) {
      final distance = GeoUtils.distanceInMeters(
        fromLatitude: position.latitude,
        fromLongitude: position.longitude,
        toLatitude: event.venueLatitude,
        toLongitude: event.venueLongitude,
      );
      inArea = distance <= event.attendanceRadiusMeters;
    }

    final row = LocationCaptureRow(
      eventId: event?.id ?? unassignedEventId,
      eventTitle: event?.title ?? unassignedEventTitle,
      participantEmail: _email.trim().toLowerCase(),
      capturedAt: capturedAt,
      latitude: position.latitude,
      longitude: position.longitude,
      accuracyMeters: position.accuracy,
      inArea: inArea,
    );
    try {
      await _db.insert(row);
      unawaited(_csv.append(row));
      _capturesThisSession++;
    } catch (_) {
      // Keep ticking; the next fix will try again.
    }
    notifyListeners();
  }
}
