import 'dart:async';

import 'package:flutter/foundation.dart';

import '../../../core/session/static_user_session.dart';
import '../domain/cares_event.dart';
import '../domain/tracked_event.dart';
import '../data/mock_events.dart';
import 'location_capture_db.dart';
import 'package:mobile/features/dashboard/data/event_reminder_scheduler.dart';

class EventParticipation {
  EventParticipation({
    required this.event,
    required this.participantEmail,
    required this.participantName,
    required this.registeredAt,
  }) : eventId = event.id;

  /// Read by the geofence tracker; replaced by
  /// [EventRegistrationStore.refreshEvent] when the feed brings a newer copy.
  CaresEvent event;
  final String eventId;
  final String participantEmail;
  final String participantName;
  final DateTime registeredAt;
  bool attendanceVerified = false;
  DateTime? attendanceVerifiedAt;
}

/// Prototype in-memory store, mirrored to SQLite (`joined_events`) so the
/// background recorder knows which events to record.
class EventRegistrationStore extends ChangeNotifier {
  EventRegistrationStore._();

  static final EventRegistrationStore instance = EventRegistrationStore._();

  final Map<String, EventParticipation> _participations = {};
  final _db = LocationCaptureDb.instance;

  String _key(String eventId, String email) =>
      '$eventId|${email.trim().toLowerCase()}';

  List<EventParticipation> participationsForEvent(String eventId) =>
      _participations.values.where((p) => p.eventId == eventId).toList();

  List<EventParticipation> participationsForEmail(String email) {
    final normalized = email.trim().toLowerCase();
    return _participations.values
        .where((p) => p.participantEmail.trim().toLowerCase() == normalized)
        .toList();
  }

  EventParticipation? participationFor(String eventId, String email) {
    return _participations[_key(eventId, email)];
  }

  bool isRegistered(String eventId, String email) {
    return _participations.containsKey(_key(eventId, email));
  }

  EventParticipation register(CaresEvent event, {String? email, String? name}) {
    final participantEmail =
        email ??
        StaticUserSession.instance.currentUser?.email ??
        'guest@cares.local';
    final participantName =
        name ??
        StaticUserSession.instance.currentUser?.firstName ??
        'Participant';

    final key = _key(event.id, participantEmail);
    final existing = _participations[key];
    if (existing != null) return existing;

    final participation = EventParticipation(
      event: event,
      participantEmail: participantEmail,
      participantName: participantName,
      registeredAt: DateTime.now(),
    );
    _participations[key] = participation;
    unawaited(
      _db.upsertJoinedEvent(TrackedEvent.fromEvent(event), participantEmail),
    );
    unawaited(EventReminderScheduler.instance.sync(event));
    notifyListeners();
    return participation;
  }

  /// Keeps the registration; lets server status or end-time changes reach the
  /// activity page and tracker.
  void refreshEvent(CaresEvent event, {required String email}) {
    final participation = _participations[_key(event.id, email)];
    if (participation == null) return;
    participation.event = event;
    unawaited(_db.upsertJoinedEvent(TrackedEvent.fromEvent(event), email));
    // A moved start time moves the reminders with it.
    unawaited(EventReminderScheduler.instance.sync(event));
    notifyListeners();
  }

  /// Prototype seed: every completed event joined, with verified attendance.
  void seedCompletedEventParticipation({String? email, String? name}) {
    final participantEmail =
        email ??
        StaticUserSession.instance.currentUser?.email ??
        'guest@cares.local';
    final participantName =
        name ??
        StaticUserSession.instance.currentUser?.firstName ??
        'Participant';

    var changed = false;
    for (final event in kMockCompletedEvents) {
      final key = _key(event.id, participantEmail);
      var participation = _participations[key];
      if (participation == null) {
        participation = EventParticipation(
          event: event,
          participantEmail: participantEmail,
          participantName: participantName,
          registeredAt: event.date.subtract(const Duration(days: 7)),
        );
        _participations[key] = participation;
        changed = true;
      }
      if (!participation.attendanceVerified) {
        participation.attendanceVerified = true;
        participation.attendanceVerifiedAt = event.date;
        changed = true;
      }
    }

    if (changed) notifyListeners();
  }

  void cancelParticipation(String eventId, String email) {
    final removed = _participations.remove(_key(eventId, email));
    unawaited(_db.deleteJoinedEvent(eventId, email));
    unawaited(EventReminderScheduler.instance.cancel(eventId));
    if (removed != null) notifyListeners();
  }

  void markAttendanceVerified(String eventId, String email) {
    final participation = participationFor(eventId, email);
    if (participation == null) return;
    participation.attendanceVerified = true;
    participation.attendanceVerifiedAt = DateTime.now();
    notifyListeners();
  }
}
