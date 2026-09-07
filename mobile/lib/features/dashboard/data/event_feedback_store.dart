import 'package:flutter/foundation.dart';

/// Feedback a volunteer submitted for an event they completed.
class EventFeedback {
  EventFeedback({
    required this.eventId,
    required this.participantEmail,
    required this.overallRating,
    required this.organizationRating,
    required this.volunteerExperienceRating,
    required this.comments,
    required this.submittedAt,
  });

  final String eventId;
  final String participantEmail;
  final int overallRating;
  final int organizationRating;
  final int volunteerExperienceRating;
  final String comments;
  final DateTime submittedAt;

  double get averageRating =>
      (overallRating + organizationRating + volunteerExperienceRating) / 3;
}

/// In-memory post-event feedback store for the static prototype phase.
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

  EventFeedback submit({
    required String eventId,
    required String participantEmail,
    required int overallRating,
    required int organizationRating,
    required int volunteerExperienceRating,
    String comments = '',
  }) {
    final feedback = EventFeedback(
      eventId: eventId,
      participantEmail: participantEmail,
      overallRating: overallRating,
      organizationRating: organizationRating,
      volunteerExperienceRating: volunteerExperienceRating,
      comments: comments.trim(),
      submittedAt: DateTime.now(),
    );
    _feedback[_key(eventId, participantEmail)] = feedback;
    notifyListeners();
    return feedback;
  }

  /// Clears feedback so the locked -> unlocked flow can be demoed again.
  void clear(String eventId, String email) {
    if (_feedback.remove(_key(eventId, email)) != null) notifyListeners();
  }
}
