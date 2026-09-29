/// Reply to `POST /v1/auth/forgot-password`.
class PasswordResetRequestResponse {
  const PasswordResetRequestResponse({
    required this.email,
    required this.sent,
    required this.reused,
    required this.expiresInSeconds,
  });

  final String email;

  /// False when a code was already in flight — the server keeps the live one
  /// rather than mailing a second, so the countdown continues from where it was.
  final bool sent;
  final bool reused;
  final int expiresInSeconds;

  factory PasswordResetRequestResponse.fromJson(Map<String, dynamic> json) {
    return PasswordResetRequestResponse(
      email: json['email'] as String? ?? '',
      sent: json['sent'] as bool? ?? false,
      reused: json['reused'] as bool? ?? false,
      expiresInSeconds: (json['expiresInSeconds'] as num?)?.toInt() ?? 0,
    );
  }
}

/// Reply to `POST /v1/auth/verify-reset-otp` — the code is spent, and this token
/// is what authorises the new password.
class PasswordResetTokenResponse {
  const PasswordResetTokenResponse({
    required this.email,
    required this.resetToken,
    required this.expiresInSeconds,
  });

  final String email;
  final String resetToken;
  final int expiresInSeconds;

  factory PasswordResetTokenResponse.fromJson(Map<String, dynamic> json) {
    return PasswordResetTokenResponse(
      email: json['email'] as String? ?? '',
      resetToken: json['resetToken'] as String? ?? '',
      expiresInSeconds: (json['expiresInSeconds'] as num?)?.toInt() ?? 0,
    );
  }
}
