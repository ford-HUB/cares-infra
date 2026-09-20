/// One request the signed-in person filed for a director to rule on, as
/// `v1/user-requests/me` returns it.
enum UserRequestKind { roleAccess, eventJoin, unknown }

enum UserRequestStatus { pending, accepted, deleted, unknown }

class UserRequestResponse {
  const UserRequestResponse({
    required this.id,
    required this.referenceNumber,
    required this.kind,
    required this.status,
    required this.summary,
    required this.createdAt,
    this.requestedRole,
    this.eventId,
    this.decidedAt,
  });

  factory UserRequestResponse.fromJson(Map<String, dynamic> json) {
    return UserRequestResponse(
      id: json['user_request_id'] as String,
      referenceNumber: json['reference_number'] as int,
      kind: switch (json['kind'] as String?) {
        'ROLE_ACCESS' => UserRequestKind.roleAccess,
        'EVENT_JOIN' => UserRequestKind.eventJoin,
        _ => UserRequestKind.unknown,
      },
      status: switch (json['status'] as String?) {
        'PENDING' => UserRequestStatus.pending,
        'ACCEPTED' => UserRequestStatus.accepted,
        'DELETED' => UserRequestStatus.deleted,
        _ => UserRequestStatus.unknown,
      },
      summary: json['summary'] as String? ?? '',
      requestedRole: json['requested_role'] as String?,
      eventId: json['event_id'] as int?,
      decidedAt: DateTime.tryParse(json['decided_at'] as String? ?? ''),
      createdAt:
          DateTime.tryParse(json['created_at'] as String? ?? '') ??
          DateTime.now(),
    );
  }

  final String id;
  final int referenceNumber;
  final UserRequestKind kind;
  final UserRequestStatus status;
  final String summary;

  /// Server role type (`VOLUNTEER`) for a role-access request.
  final String? requestedRole;
  final int? eventId;
  final DateTime? decidedAt;
  final DateTime createdAt;
}
