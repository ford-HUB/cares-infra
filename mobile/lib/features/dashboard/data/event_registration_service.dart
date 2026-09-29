import 'package:mobile/core/services/api_client.dart';

/// The event's slot numbers as the server holds them right after a join or a
/// cancellation — what the details screen and the cards redraw from.
class EventRegistrationResult {
  const EventRegistrationResult({
    required this.eventId,
    required this.isRegistered,
    required this.maxParticipants,
    required this.participants,
    required this.slotsLeft,
  });

  factory EventRegistrationResult.fromJson(Map<String, dynamic> json) {
    return EventRegistrationResult(
      eventId: json['event_id'] as int,
      isRegistered: json['is_registered'] as bool? ?? false,
      maxParticipants: json['max_participants'] as int? ?? 0,
      participants: json['participants'] as int? ?? 0,
      slotsLeft: json['slots_left'] as int? ?? 0,
    );
  }

  final int eventId;
  final bool isRegistered;
  final int maxParticipants;
  final int participants;
  final int slotsLeft;
}

/// `POST` / `DELETE /events/:id/register` — takes or gives back one slot on a
/// server event. The server counts registrations from attendance rows, so the
/// numbers that come back are the real ones, not a local guess.
class EventRegistrationService {
  EventRegistrationService({ApiClient? apiClient})
    : _api = apiClient ?? ApiClient();

  final ApiClient _api;

  Future<EventRegistrationResult> register(int eventId) async {
    final response = await _api.postJson(
      '/events/$eventId/register',
      body: const {},
    );
    return EventRegistrationResult.fromJson(
      response['data'] as Map<String, dynamic>,
    );
  }

  Future<EventRegistrationResult> cancel(int eventId) async {
    final response = await _api.deleteJson('/events/$eventId/register');
    return EventRegistrationResult.fromJson(
      response['data'] as Map<String, dynamic>,
    );
  }
}
