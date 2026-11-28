import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';

import '../../../core/services/connectivity_monitor.dart';
import '../domain/location_records.dart';
import '../domain/tracked_event.dart';
import 'location_capture_db.dart';
import 'location_sync_service.dart';

/// Streams GPS fixes; each second sends the latest live or stores it in SQLite.
/// Free of UI/session state so it runs in-app and in the Android service
/// isolate (email and events come from SQLite via [reloadEvents]).
///
/// Online: POSTed and kept as a synced row; a failed POST goes offline and
/// pauses live posting for [liveRetryAfter]. Offline: stored pending. Back
/// online: pending rows upload as one CSV per event via [LocationSyncService].
class LocationRecorder {
  LocationRecorder({required String email, VoidCallback? onChanged})
    : _email = email.trim().toLowerCase(),
      _onChanged = onChanged;

  /// Older fixes aren't re-written (GPS lost); a still phone refreshes well
  /// within this.
  static const Duration staleFixAfter = Duration(seconds: 30);

  /// Local-only window after a failed live post.
  static const Duration liveRetryAfter = Duration(seconds: 30);

  /// Used when no joined event is known.
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

  bool get isStreaming => _positions != null;
  bool get isLocationBlocked => _locationBlocked;
  bool get isSyncing => _syncing;
  int get captures => _captures;
  int get liveSubmits => _liveSubmits;

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

  List<TrackedEvent> get upcomingEvents {
    final now = DateTime.now();
    return [
      for (final e in _events)
        if (e.isUpcoming(now)) e,
    ]..sort((a, b) => a.startsAt.compareTo(b.startsAt));
  }

  Future<void> reloadEvents() async {
    try {
      _events = await _db.readJoinedEvents(_email);
    } catch (_) {}
    _onChanged?.call();
  }

  /// Idempotent. False when location is off or denied; the caller retries.
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

  /// Fresh connection: try live again and push the offline backlog.
  void onBackOnline() {
    _liveFailedAt = null;
    unawaited(syncPending());
  }

  /// One run at a time.
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

  /// An event whose window is open, else the next to start.
  TrackedEvent? _hintEvent(DateTime now) {
    final joined = upcomingEvents;
    if (joined.isEmpty) return null;
    for (final event in joined) {
      if (event.isTrackingWindowOpen(now)) return event;
    }
    return joined.first;
  }

  Future<void> _writeTick() async {
    final position = _lastFix;
    final fixAt = _lastFixAt;
    if (position == null || fixAt == null || _positions == null) return;
    if (DateTime.now().difference(fixAt) > staleFixAfter) return;

    final capturedAt = DateTime.now();
    final event = _hintEvent(capturedAt);
    final inArea =
        event?.containsPoint(
          latitude: position.latitude,
          longitude: position.longitude,
        ) ??
        false;

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
      // Also kept locally as synced so Records shows the whole trail.
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
