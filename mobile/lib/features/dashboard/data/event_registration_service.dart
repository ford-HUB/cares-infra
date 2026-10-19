import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/features/dashboard/data/notification_sync.dart';
import 'package:mobile/features/dashboard/domain/event_participation_role.dart';

/// The event's slot numbers as the server holds them right after a join or a
/// cancellation — what the details screen and the cards redraw from.
class EventRegistrationResult {
  const EventRegistrationResult({
    required this.eventId,
    required this.isRegistered,
    required this.maxParticipants,
    required this.participants,
    required this.slotsLeft,
    this.participationRole,
    this.roleApproval,
  });

  factory EventRegistrationResult.fromJson(Map<String, dynamic> json) {
    return EventRegistrationResult(
      eventId: json['event_id'] as int,
      isRegistered: json['is_registered'] as bool? ?? false,
      maxParticipants: json['max_participants'] as int? ?? 0,
      participants: json['participants'] as int? ?? 0,
      slotsLeft: json['slots_left'] as int? ?? 0,
      participationRole: EventParticipationRole.fromApi(
        json['participation_role'] as String?,
      ),
      roleApproval: EventRoleApproval.fromApi(json['role_approval'] as String?),
    );
  }

  final int eventId;
  final bool isRegistered;
  final int maxParticipants;
  final int participants;
  final int slotsLeft;

  /// The role on the caller's registration; null after a cancellation.
  final EventParticipationRole? participationRole;

  /// Pending for Organizer, Facilitator and Speaker until a Director or
  /// Coordinator rules; approved straight away for Regular.
  final EventRoleApproval? roleApproval;
}

/// `POST` / `DELETE /events/:id/register` — takes or gives back one slot on a
/// server event. The server counts registrations from attendance rows, so the
/// numbers that come back are the real ones, not a local guess.
class EventRegistrationService {
  EventRegistrationService({ApiClient? apiClient})
    : _api = apiClient ?? ApiClient();

  final ApiClient _api;

  /// Registers in [role]. Anything but Regular is filed for a Director's or
  /// Coordinator's review — no proof is uploaded.
  Future<EventRegistrationResult> register(
    int eventId, {
    EventParticipationRole role = EventParticipationRole.regular,
  }) async {
    final response = await _api.postJson(
      '/events/$eventId/register',
      body: {'participation_role': role.apiValue},
    );
    // The server answers with a notice; pull it in without waiting a poll.
    NotificationSync.instance.refreshSoon();
    return EventRegistrationResult.fromJson(
      response['data'] as Map<String, dynamic>,
    );
  }

  Future<EventRegistrationResult> cancel(int eventId) async {
    final response = await _api.deleteJson('/events/$eventId/register');
    NotificationSync.instance.refreshSoon();
    return EventRegistrationResult.fromJson(
      response['data'] as Map<String, dynamic>,
    );
  }
}
