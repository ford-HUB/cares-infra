import 'package:flutter/foundation.dart';

class EventFeedback {
  EventFeedback({
    required this.eventId,
    required this.participantEmail,
    required this.submittedAt,
    this.answers = const {},
  });

  /// The `CaresEvent.id` form (`event-42`) the cards key on.
  final String eventId;
  final String participantEmail;
  final DateTime submittedAt;

  /// Empty when only the server summary is known.
  final Map<String, dynamic> answers;
}

/// Server mirror; feedback gates the certificate.
class EventFeedbackStore extends ChangeNotifier {
  EventFeedbackStore._();

  static final EventFeedbackStore instance = EventFeedbackStore._();

  final Map<String, EventFeedback> _feedback = {};

  String _key(String eventId, String email) =>
      '$eventId|${email.trim().toLowerCase()}';

  EventFeedback? feedbackFor(String eventId, String email) =>
      _feedback[_key(eventId, email)];

  bool hasSubmitted(String eventId, String email) =>
      _feedback.containsKey(_key(eventId, email));

  bool isCertificateUnlocked(String eventId, String email) =>
      hasSubmitted(eventId, email);

  EventFeedback markSubmitted({
    required String eventId,
    required String participantEmail,
    required DateTime submittedAt,
    Map<String, dynamic> answers = const {},
  }) {
    final feedback = EventFeedback(
      eventId: eventId,
      participantEmail: participantEmail,
      submittedAt: submittedAt,
      answers: answers,
    );
    _feedback[_key(eventId, participantEmail)] = feedback;
    notifyListeners();
    return feedback;
  }

  /// Picks up submissions from other devices and drops removed ones.
  void hydrate(String email, Map<String, DateTime> submittedAtByEventId) {
    final suffix = '|${email.trim().toLowerCase()}';
    var changed = false;

    _feedback.removeWhere((key, feedback) {
      final stale =
          key.endsWith(suffix) &&
          !submittedAtByEventId.containsKey(feedback.eventId);
      if (stale) changed = true;
      return stale;
    });

    for (final entry in submittedAtByEventId.entries) {
      final key = _key(entry.key, email);
      if (_feedback.containsKey(key)) continue;
      _feedback[key] = EventFeedback(
        eventId: entry.key,
        participantEmail: email,
        submittedAt: entry.value,
      );
      changed = true;
    }

    if (changed) notifyListeners();
  }

  /// Demo helper to replay the locked → unlocked flow.
  void clear(String eventId, String email) {
    if (_feedback.remove(_key(eventId, email)) != null) notifyListeners();
  }
}
