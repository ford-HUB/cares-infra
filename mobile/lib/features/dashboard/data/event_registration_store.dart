import 'package:flutter/foundation.dart';

import '../../../core/session/static_user_session.dart';
import '../data/mock_events.dart';

class EventParticipation {
  EventParticipation({
    required this.eventId,
    required this.participantEmail,
    required this.participantName,
    required this.registeredAt,
  });

  final String eventId;
  final String participantEmail;
  final String participantName;
  final DateTime registeredAt;
  bool attendanceVerified = false;
  DateTime? attendanceVerifiedAt;
}

/// In-memory event registration store for the static prototype phase.
class EventRegistrationStore extends ChangeNotifier {
  EventRegistrationStore._();

  static final EventRegistrationStore instance = EventRegistrationStore._();

  final Map<String, EventParticipation> _participations = {};

  String _key(String eventId, String email) =>
      '$eventId|${email.trim().toLowerCase()}';

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
        email ?? StaticUserSession.instance.currentUser?.email ?? 'guest@cares.local';
    final participantName =
        name ?? StaticUserSession.instance.currentUser?.firstName ?? 'Participant';

    final key = _key(event.id, participantEmail);
    final existing = _participations[key];
    if (existing != null) return existing;

    final participation = EventParticipation(
      eventId: event.id,
      participantEmail: participantEmail,
      participantName: participantName,
      registeredAt: DateTime.now(),
    );
    _participations[key] = participation;
    notifyListeners();
    return participation;
  }

  void markAttendanceVerified(String eventId, String email) {
    final participation = participationFor(eventId, email);
    if (participation == null) return;
    participation.attendanceVerified = true;
    participation.attendanceVerifiedAt = DateTime.now();
    notifyListeners();
  }
}
