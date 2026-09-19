import 'cares_event.dart';

/// The slice of a joined [CaresEvent] the geofence recorder needs — small
/// enough to persist in SQLite and read back from the background service,
/// which has no access to the app's in-memory event list.
class TrackedEvent {
  const TrackedEvent({
    required this.id,
    required this.title,
    required this.venueLatitude,
    required this.venueLongitude,
    required this.attendanceRadiusMeters,
    required this.trackingStartsAt,
    required this.startsAt,
    required this.endsAt,
    required this.isCompleted,
  });

  factory TrackedEvent.fromEvent(CaresEvent event) => TrackedEvent(
    id: event.id,
    title: event.title,
    venueLatitude: event.venueLatitude,
    venueLongitude: event.venueLongitude,
    attendanceRadiusMeters: event.attendanceRadiusMeters,
    trackingStartsAt: event.trackingStartsAt,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    isCompleted: event.isCompleted,
  );

  final String id;
  final String title;
  final double venueLatitude;
  final double venueLongitude;
  final double attendanceRadiusMeters;
  final DateTime trackingStartsAt;
  final DateTime startsAt;
  final DateTime endsAt;
  final bool isCompleted;

  /// Not over yet, as of [now].
  bool isUpcoming(DateTime now) => !isCompleted && now.isBefore(endsAt);

  bool isTrackingWindowOpen(DateTime now) =>
      !isCompleted && !now.isBefore(trackingStartsAt) && now.isBefore(endsAt);

  Map<String, Object?> toMap(String email) => {
    'event_id': id,
    'participant_email': email,
    'title': title,
    'venue_lat': venueLatitude,
    'venue_lng': venueLongitude,
    'radius_m': attendanceRadiusMeters,
    'tracking_starts_at': trackingStartsAt.toUtc().millisecondsSinceEpoch,
    'starts_at': startsAt.toUtc().millisecondsSinceEpoch,
    'ends_at': endsAt.toUtc().millisecondsSinceEpoch,
    'is_completed': isCompleted ? 1 : 0,
  };

  static TrackedEvent fromMap(Map<String, Object?> m) => TrackedEvent(
    id: m['event_id'] as String,
    title: m['title'] as String,
    venueLatitude: (m['venue_lat'] as num).toDouble(),
    venueLongitude: (m['venue_lng'] as num).toDouble(),
    attendanceRadiusMeters: (m['radius_m'] as num).toDouble(),
    trackingStartsAt: _local(m['tracking_starts_at'] as int),
    startsAt: _local(m['starts_at'] as int),
    endsAt: _local(m['ends_at'] as int),
    isCompleted: (m['is_completed'] as int) == 1,
  );

  static DateTime _local(int utcMillis) =>
      DateTime.fromMillisecondsSinceEpoch(utcMillis, isUtc: true).toLocal();
}
