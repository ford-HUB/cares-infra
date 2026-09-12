import 'package:mobile/features/dashboard/data/help_center_data.dart';

/// Wire shape of `GET /support-tickets/me` and its siblings, translated into
/// the [SupportRequest] the screens render. Enum strings come back
/// SCREAMING_SNAKE from the server and are mapped here, in one place.
class SupportTicketResponse {
  const SupportTicketResponse({
    required this.id,
    required this.referenceNumber,
    required this.subject,
    required this.description,
    required this.type,
    required this.status,
    required this.assigneeName,
    required this.replies,
    required this.createdAt,
    required this.updatedAt,
  });

  factory SupportTicketResponse.fromJson(Map<String, dynamic> json) {
    return SupportTicketResponse(
      id: json['support_ticket_id'] as String,
      referenceNumber: json['reference_number'] as int,
      subject: json['subject'] as String,
      description: json['description'] as String,
      type: json['type'] as String,
      status: json['status'] as String,
      assigneeName: json['assignee_name'] as String?,
      replies: (json['replies'] as List<dynamic>)
          .map(
            (r) =>
                SupportTicketReplyResponse.fromJson(r as Map<String, dynamic>),
          )
          .toList(growable: false),
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }

  final String id;
  final int referenceNumber;
  final String subject;
  final String description;
  final String type;
  final String status;
  final String? assigneeName;
  final List<SupportTicketReplyResponse> replies;
  final DateTime createdAt;
  final DateTime updatedAt;

  SupportRequest toRequest() {
    return SupportRequest(
      id: id,
      referenceNumber: referenceNumber,
      subject: subject,
      description: description,
      type: supportTicketTypeFromApi(type),
      status: _statusFromApi(status),
      createdAt: createdAt,
      updatedAt: updatedAt,
      assignee: assigneeName,
      conversation: replies.map((r) => r.toMessage()).toList(growable: false),
    );
  }
}

class SupportTicketReplyResponse {
  const SupportTicketReplyResponse({
    required this.authorName,
    required this.authorType,
    required this.body,
    required this.createdAt,
  });

  factory SupportTicketReplyResponse.fromJson(Map<String, dynamic> json) {
    return SupportTicketReplyResponse(
      authorName: json['author_name'] as String,
      authorType: json['author_type'] as String,
      body: json['body'] as String,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }

  final String authorName;
  final String authorType;
  final String body;
  final DateTime createdAt;

  SupportMessage toMessage() {
    final isStaff = authorType == 'STAFF';
    return SupportMessage(
      author: isStaff ? SupportAuthor.agent : SupportAuthor.you,
      authorName: isStaff ? authorName : null,
      body: body,
      sentAt: createdAt,
    );
  }
}

const _kTypeToApi = <SupportTicketType, String>{
  SupportTicketType.bug: 'BUG',
  SupportTicketType.login: 'LOGIN',
  SupportTicketType.account: 'ACCOUNT',
  SupportTicketType.verification: 'VERIFICATION',
  SupportTicketType.event: 'EVENT',
  SupportTicketType.mobileApp: 'MOBILE_APP',
  SupportTicketType.featureRequest: 'FEATURE_REQUEST',
  SupportTicketType.report: 'REPORT',
  SupportTicketType.other: 'OTHER',
};

String supportTicketTypeToApi(SupportTicketType type) => _kTypeToApi[type]!;

SupportTicketType supportTicketTypeFromApi(String value) {
  for (final entry in _kTypeToApi.entries) {
    if (entry.value == value) return entry.key;
  }
  return SupportTicketType.other;
}

SupportRequestStatus _statusFromApi(String value) => switch (value) {
  'OPEN' => SupportRequestStatus.open,
  'IN_PROGRESS' => SupportRequestStatus.inProgress,
  'UNDER_VERIFICATION' => SupportRequestStatus.underVerification,
  'CLIENT_FEEDBACK' => SupportRequestStatus.clientFeedback,
  'RESOLVED' => SupportRequestStatus.resolved,
  'CLOSED' => SupportRequestStatus.closed,
  _ => SupportRequestStatus.open,
};
