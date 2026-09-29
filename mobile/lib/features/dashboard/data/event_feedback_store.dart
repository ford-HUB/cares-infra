import 'package:flutter/foundation.dart';

/// Feedback a volunteer submitted for an event they completed.
class EventFeedback {
  EventFeedback({
    required this.eventId,
    required this.participantEmail,
    required this.submittedAt,
    this.answers = const {},
  });

  /// The `CaresEvent.id` form (`event-42`), which is what the cards key on.
  final String eventId;
  final String participantEmail;
  final DateTime submittedAt;

  /// Answers keyed by question id; empty when only the server summary is known.
  final Map<String, dynamic> answers;
}

/// Which completed events the signed-in volunteer has already given feedback
/// on. The truth lives on the server; this mirrors it so the activity tab,
/// the event details screen and the certificate wallet redraw together.
///
/// Feedback gates the certificate: a volunteer only unlocks the certificate
/// for an event once feedback for that event has been submitted.
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

  /// True once feedback exists, which is what unlocks the certificate.
  bool isCertificateUnlocked(String eventId, String email) =>
      hasSubmitted(eventId, email);

  /// Records a submission the server just accepted.
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

  /// Replaces everything known for [email] with the server's list, so a
  /// submission made on another device shows and a removed one disappears.
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

  /// Clears feedback so the locked -> unlocked flow can be demoed again.
  void clear(String eventId, String email) {
    if (_feedback.remove(_key(eventId, email)) != null) notifyListeners();
  }
}
