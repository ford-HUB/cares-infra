import 'package:mobile/features/dashboard/domain/account_log.dart';

/// `GET /audit-logs/me` — one item of the caller's own audit trail.
class ActivityLogItem {
  const ActivityLogItem({
    required this.id,
    required this.action,
    required this.description,
    required this.category,
    required this.outcome,
    required this.targetLabel,
    required this.source,
    required this.ipAddress,
    required this.userAgent,
    required this.bySelf,
    required this.actorName,
    required this.actorRole,
    required this.metadata,
    required this.createdAt,
  });

  factory ActivityLogItem.fromJson(Map<String, dynamic> json) {
    final metadata = json['metadata'];
    return ActivityLogItem(
      id: json['activity_log_id'] as String,
      action: json['action'] as String,
      description: json['description'] as String,
      category: json['category'] as String,
      outcome: json['outcome'] as String,
      targetLabel: json['target_label'] as String,
      source: json['source'] as String,
      ipAddress: json['ip_address'] as String,
      userAgent: json['user_agent'] as String?,
      bySelf: json['by_self'] as bool? ?? true,
      actorName: json['actor_name'] as String? ?? '',
      actorRole: json['actor_role'] as String?,
      metadata: metadata is Map
          ? metadata.map((k, v) => MapEntry('$k', '$v'))
          : const {},
      createdAt: DateTime.parse(json['created_at'] as String).toLocal(),
    );
  }

  final String id;
  final String action;
  final String description;
  final String category;
  final String outcome;
  final String targetLabel;
  final String source;
  final String ipAddress;
  final String? userAgent;

  /// False when staff (or the system) did this to the account, not the holder.
  final bool bySelf;
  final String actorName;
  final String? actorRole;
  final Map<String, String> metadata;
  final DateTime createdAt;

  AccountLogEntry toEntry() {
    final where = [
      if (!bySelf && actorName.isNotEmpty) 'by $actorName${_roleSuffix()}',
      if (source == 'PORTAL') 'Staff portal',
      if (source == 'SYSTEM') 'System',
      if (ipAddress.isNotEmpty && ipAddress != 'unknown') ipAddress,
    ].join(' · ');

    return AccountLogEntry(
      id: id,
      action: action,
      category: AccountLogCategoryX.fromAction(action),
      title: _titleFor(action, outcome),
      detail: where.isEmpty ? description : '$description · $where',
      at: createdAt,
      flagged: outcome != 'SUCCESS',
    );
  }
}

extension on ActivityLogItem {
  /// " (Admin)" after a staff name — the account holder may not know who
  /// the person is, but the role says why they could act.
  String _roleSuffix() {
    final role = actorRole;
    if (role == null || role.isEmpty) return '';
    final words = role.toLowerCase().split('_');
    return ' (${words.map((w) => w[0].toUpperCase() + w.substring(1)).join(' ')})';
  }
}

class ActivityLogPage {
  const ActivityLogPage({required this.items, required this.nextCursor});

  factory ActivityLogPage.fromJson(Map<String, dynamic> json) {
    return ActivityLogPage(
      items: (json['items'] as List<dynamic>)
          .map((e) => ActivityLogItem.fromJson(e as Map<String, dynamic>))
          .toList(),
      nextCursor: json['next_cursor'] as String?,
    );
  }

  final List<ActivityLogItem> items;
  final String? nextCursor;
}

/// Short row title per action key; the server description carries the detail.
String _titleFor(String action, String outcome) {
  final failed = outcome != 'SUCCESS';
  return switch (action) {
    'auth.mobile.sign-in' => failed ? 'Sign-in attempt refused' : 'Signed in',
    'auth.mobile.signed-out' => 'Signed out',
    'auth.mobile.registered' => 'Account created',
    'auth.mobile.password-reset' => 'Password reset',
    'auth.mobile.password-reset.requested' => 'Password reset requested',
    'account.password.changed' => 'Password changed',
    'account.email.changed' => 'Email changed',
    'account.role.switched' => 'Switched role',
    'account.role.unlocked' => 'Role unlocked',
    'profile.updated' => 'Profile updated',
    'profile.photo.updated' => 'Profile photo updated',
    'profile.interests.updated' => 'Interests updated',
    'profile.school-record.updated' => 'School record updated',
    'profile.address.updated' => 'Address updated',
    'support.ticket.created' => 'Support request sent',
    'support.ticket.replied' => 'Replied to support',
    'support.ticket.fix-confirmed' => 'Support fix confirmed',
    'support.ticket.fix-rejected' => 'Support fix rejected',
    'support.ticket.reopened' => 'Support request reopened',
    // Done to the account by staff on the portal.
    'user.restricted' => 'Account restricted',
    'user.unrestricted' => 'Account restriction lifted',
    'user.ip.blocked' => 'Network blocked',
    'user.ip.unblocked' => 'Network unblocked',
    'user.provisioned' => 'Account provisioned',
    'user.credentials.reissued' => 'Credentials reissued',
    'session.revoked' => 'Device signed out',
    'session.revoked-all' => 'All devices signed out',
    'access-control.user-permissions.updated' => 'Permissions changed',
    'access-control.actions.suspended' => 'Actions suspended',
    'access-control.suspension.lifted' => 'Suspension lifted',
    _ => _humanise(action),
  };
}

/// `events.registration.cancelled` → "Events registration cancelled".
String _humanise(String action) {
  final words = action.replaceAll('.', ' ').replaceAll('-', ' ').trim();
  if (words.isEmpty) return 'Activity';
  return words[0].toUpperCase() + words.substring(1);
}
