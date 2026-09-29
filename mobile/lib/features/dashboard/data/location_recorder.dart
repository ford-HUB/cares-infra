import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';

import '../../../core/services/connectivity_monitor.dart';
import '../domain/location_records.dart';
import '../domain/tracked_event.dart';
import '../utils/geo_utils.dart';
import 'location_capture_db.dart';
import 'location_sync_service.dart';

/// The recording engine: streams GPS fixes and, once a second, sends the
/// latest one live to the server or stores it in SQLite for a later sync.
///
/// Deliberately free of any UI or session state so the same class runs in
/// the app (foreground, non-Android) and inside the Android foreground
/// service isolate, where nothing from the app's memory is reachable. It
/// only needs the signed-in email and the joined events, both read from
/// SQLite through [reloadEvents].
///
/// Where a fix goes depends on connectivity:
///
/// * **Online** — it is POSTed to the server right away and kept in SQLite
///   as an already-synced row, so the Records screens show it. If the POST
///   fails the fix takes the offline path, and live posting pauses for
///   [liveRetryAfter] so a dead server doesn't cost a request per second.
/// * **Offline** — it is stored in SQLite as a pending row.
/// * **Back online** — every pending row is uploaded automatically, one CSV
///   per event, through [LocationSyncService].
class LocationRecorder {
  LocationRecorder({required String email, VoidCallback? onChanged})
    : _email = email.trim().toLowerCase(),
      _onChanged = onChanged;

  /// A fix older than this is not re-written by the timer — the device has
  /// stopped delivering positions (e.g. GPS lost indoors). A standing-still
  /// phone still refreshes well inside this, so it keeps being recorded.
  static const Duration staleFixAfter = Duration(seconds: 30);

  /// After a live post fails, fixes are stored locally for this long before
  /// the next attempt to go live again.
  static const Duration liveRetryAfter = Duration(seconds: 30);

  /// Written when no joined event is known (e.g. the list is empty).
  static const String unassignedEventId = 'unassigned';
  static const String unassignedEventTitle = 'Awaiting event match';

  final VoidCallback? _onChanged;
  final _connectivity = ConnectivityMonitor.instance;
  final _db = LocationCaptureDb.instance;
  final _sync = LocationSyncService();

  String _email;
  List<TrackedEvent> _events = const [];

  Timer? _captureTimer;
  StreamSubscription<Position>? _positions;
  Position? _lastFix;
  DateTime? _lastFixAt;
  DateTime? _liveFailedAt;
  bool _locationBlocked = false;
  bool _syncing = false;
  int _captures = 0;
  int _liveSubmits = 0;

  String get email => _email;
  List<TrackedEvent> get events => _events;
  Position? get lastFix => _lastFix;
  DateTime? get lastFixAt => _lastFixAt;

  /// The stream is up and delivering.
  bool get isStreaming => _positions != null;
  bool get isLocationBlocked => _locationBlocked;
  bool get isSyncing => _syncing;
  int get captures => _captures;
  int get liveSubmits => _liveSubmits;

  /// True while fixes are going to the server live rather than into SQLite.
  bool get isLive => _connectivity.isOnline == true && !_liveCoolingDown;

  bool get _liveCoolingDown {
    final failedAt = _liveFailedAt;
    return failedAt != null &&
        DateTime.now().difference(failedAt) < liveRetryAfter;
  }

  set email(String value) {
    final normalized = value.trim().toLowerCase();
    if (normalized == _email) return;
    _email = normalized;
    unawaited(reloadEvents());
  }

  /// Joined events that haven't ended yet, soonest first.
  List<TrackedEvent> get upcomingEvents {
    final now = DateTime.now();
    return [
      for (final e in _events)
        if (e.isUpcoming(now)) e,
    ]..sort((a, b) => a.startsAt.compareTo(b.startsAt));
  }

  /// Re-reads the joined events from SQLite.
  Future<void> reloadEvents() async {
    try {
      _events = await _db.readJoinedEvents(_email);
    } catch (_) {}
    _onChanged?.call();
  }

  /// Starts the GPS stream (idempotent). False when location is off or the
  /// permission is missing — the caller re-tries on its next evaluation.
  Future<bool> start() async {
    if (_positions != null) return true;
    if (!await _canTrack()) {
      _locationBlocked = true;
      _onChanged?.call();
      return false;
    }
    _locationBlocked = false;
    _positions = Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.best,
        distanceFilter: 0,
      ),
    ).listen(_onPosition, onError: (Object _) => stop());
    // Seed the first fix right away instead of waiting on the stream.
    unawaited(_seedFirstFix());
    _captureTimer = Timer.periodic(
      LocationRecords.captureInterval,
      (_) => _writeTick(),
    );
    _onChanged?.call();
    return true;
  }

  void stop() {
    _positions?.cancel();
    _positions = null;
    _captureTimer?.cancel();
    _captureTimer = null;
    _onChanged?.call();
  }

  /// A fresh connection: try live again and push what piled up offline.
  void onBackOnline() {
    _liveFailedAt = null;
    unawaited(syncPending());
  }

  /// Uploads every pending row now. One run at a time.
  Future<void> syncPending() async {
    if (_syncing) return;
    _syncing = true;
    _onChanged?.call();
    try {
      await _sync.syncPending(email: _email);
    } finally {
      _syncing = false;
      _onChanged?.call();
    }
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
  /// else the next to start. Null when none is known.
  TrackedEvent? _hintEvent(DateTime now) {
    final joined = upcomingEvents;
    if (joined.isEmpty) return null;
    for (final event in joined) {
      if (event.isTrackingWindowOpen(now)) return event;
    }
    return joined.first;
  }

  /// One-second tick: send the latest fix live, or store it for later.
  Future<void> _writeTick() async {
    final position = _lastFix;
    final fixAt = _lastFixAt;
    if (position == null || fixAt == null || _positions == null) return;
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
      participantEmail: _email,
      capturedAt: capturedAt,
      latitude: position.latitude,
      longitude: position.longitude,
      accuracyMeters: position.accuracy,
      inArea: inArea,
    );
    if (isLive) {
      // Not awaited: a slow request must not hold up the next second's fix.
      unawaited(_submitLive(row));
      return;
    }
    await _storeLocally(row);
  }

  Future<void> _submitLive(LocationCaptureRow row) async {
    if (await _sync.submitLive(row)) {
      _liveSubmits++;
      // Kept locally too, already marked synced, so the Geolocation Records
      // screens show the whole trail — not just what was buffered offline.
      await _storeLocally(row.copyWith(synced: true));
      return;
    }
    // Server unreachable: keep this fix and go local for a while.
    _liveFailedAt = DateTime.now();
    await _storeLocally(row);
  }

  Future<void> _storeLocally(LocationCaptureRow row) async {
    try {
      await _db.insert(row);
      _captures++;
    } catch (_) {
      // Keep ticking; the next fix will try again.
    }
    _onChanged?.call();
  }
}
