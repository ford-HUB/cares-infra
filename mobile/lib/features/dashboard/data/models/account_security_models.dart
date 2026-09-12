/// Wire shapes for `/account/mobile/*` — the Account Security screens.
library;

class EmailChangeCodeResponse {
  const EmailChangeCodeResponse({
    required this.email,
    required this.sent,
    required this.reused,
    required this.expiresInSeconds,
  });

  factory EmailChangeCodeResponse.fromJson(Map<String, dynamic> json) {
    return EmailChangeCodeResponse(
      email: json['email'] as String? ?? '',
      sent: json['sent'] as bool? ?? false,
      reused: json['reused'] as bool? ?? false,
      expiresInSeconds: (json['expiresInSeconds'] as num?)?.toInt() ?? 0,
    );
  }

  final String email;
  final bool sent;

  /// A live code already existed, so the server mailed nothing new.
  final bool reused;
  final int expiresInSeconds;
}

class EmailChangeTokenResponse {
  const EmailChangeTokenResponse({
    required this.changeToken,
    required this.expiresInSeconds,
  });

  factory EmailChangeTokenResponse.fromJson(Map<String, dynamic> json) {
    return EmailChangeTokenResponse(
      changeToken: json['changeToken'] as String? ?? '',
      expiresInSeconds: (json['expiresInSeconds'] as num?)?.toInt() ?? 0,
    );
  }

  final String changeToken;
  final int expiresInSeconds;
}

class ChangeEmailResponse {
  const ChangeEmailResponse({required this.email, required this.accessToken});

  factory ChangeEmailResponse.fromJson(Map<String, dynamic> json) {
    return ChangeEmailResponse(
      email: json['email'] as String? ?? '',
      accessToken: json['access_token'] as String? ?? '',
    );
  }

  final String email;

  /// Re-signed with the new address; must replace the session token.
  final String accessToken;
}

class ChangePasswordResponse {
  const ChangePasswordResponse({
    required this.updated,
    required this.revokedSessions,
  });

  factory ChangePasswordResponse.fromJson(Map<String, dynamic> json) {
    return ChangePasswordResponse(
      updated: json['updated'] as bool? ?? false,
      revokedSessions: (json['revoked_sessions'] as num?)?.toInt() ?? 0,
    );
  }

  final bool updated;
  final int revokedSessions;
}

/// One of the caller's signed-in devices, as the server records it.
class AccountSession {
  const AccountSession({
    required this.sessionId,
    required this.source,
    required this.ipAddress,
    required this.userAgent,
    required this.createdAt,
    required this.lastSeenAt,
    required this.expiresAt,
    required this.isCurrent,
  });

  factory AccountSession.fromJson(Map<String, dynamic> json) {
    return AccountSession(
      sessionId: json['session_id'] as String? ?? '',
      source: json['source'] as String? ?? '',
      ipAddress: json['ip_address'] as String? ?? '',
      userAgent: json['user_agent'] as String?,
      createdAt: DateTime.tryParse(json['created_at'] as String? ?? ''),
      lastSeenAt: DateTime.tryParse(json['last_seen_at'] as String? ?? ''),
      expiresAt: DateTime.tryParse(json['expires_at'] as String? ?? ''),
      isCurrent: json['is_current'] as bool? ?? false,
    );
  }

  final String sessionId;

  /// `MOBILE` or `SITE`.
  final String source;
  final String ipAddress;
  final String? userAgent;
  final DateTime? createdAt;
  final DateTime? lastSeenAt;
  final DateTime? expiresAt;
  final bool isCurrent;
}
