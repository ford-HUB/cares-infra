import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/features/dashboard/domain/event_participation_role.dart';

/// One volunteer holding a slot on an event, as the participants list shows it.
class EventParticipant {
  const EventParticipant({
    required this.name,
    required this.isMe,
    this.participationRole,
    this.roleApproval,
    this.attendanceStatus,
  });

  factory EventParticipant.fromJson(Map<String, dynamic> json) {
    return EventParticipant(
      name: (json['name'] as String?)?.trim().isNotEmpty == true
          ? (json['name'] as String).trim()
          : 'Volunteer',
      isMe: json['is_me'] as bool? ?? false,
      participationRole: EventParticipationRole.fromApi(
        json['participation_role'] as String?,
      ),
      roleApproval: EventRoleApproval.fromApi(json['role_approval'] as String?),
      attendanceStatus: json['attendance_status'] as String?,
    );
  }

  final String name;

  /// The signed-in volunteer's own row.
  final bool isMe;
  final EventParticipationRole? participationRole;
  final EventRoleApproval? roleApproval;

  /// PENDING until the geofence rules, then COMPLETED or ABSENT.
  final String? attendanceStatus;

  bool get attended => attendanceStatus == 'COMPLETED';

  /// A non-Regular role a Director or Coordinator has confirmed.
  EventParticipationRole? get approvedSpecialRole =>
      participationRole != null &&
          participationRole!.requiresApproval &&
          roleApproval == EventRoleApproval.approved
      ? participationRole
      : null;
}

/// `GET /events/:id/participants` — the volunteers registered for a server event.
class EventParticipantsService {
  EventParticipantsService({ApiClient? apiClient})
    : _api = apiClient ?? ApiClient();

  final ApiClient _api;

  Future<List<EventParticipant>> list(int eventId) async {
    final response = await _api.getJson('/events/$eventId/participants');
    final data = response['data'] as Map<String, dynamic>? ?? const {};
    final rows = data['participants'] as List<dynamic>? ?? const [];
    return rows
        .whereType<Map<String, dynamic>>()
        .map(EventParticipant.fromJson)
        .toList();
  }
}
