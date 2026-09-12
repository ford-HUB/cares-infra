import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/features/dashboard/data/models/account_security_models.dart';

/// The calls behind Account Security: the three-step email change (code to
/// the current inbox → change token → new address), the password change,
/// and the caller's own session list.
class AccountSecurityService {
  AccountSecurityService({ApiClient? apiClient})
    : _api = apiClient ?? ApiClient();

  final ApiClient _api;

  Future<EmailChangeCodeResponse> sendEmailChangeCode() async {
    final response = await _api.postJson(
      '/account/mobile/email/send-code',
      body: const {},
    );
    return EmailChangeCodeResponse.fromJson(
      response['data'] as Map<String, dynamic>,
    );
  }

  Future<EmailChangeTokenResponse> verifyEmailChangeCode(String otp) async {
    final response = await _api.postJson(
      '/account/mobile/email/verify-code',
      body: {'otp': otp.trim()},
    );
    return EmailChangeTokenResponse.fromJson(
      response['data'] as Map<String, dynamic>,
    );
  }

  Future<ChangeEmailResponse> changeEmail({
    required String changeToken,
    required String newEmail,
  }) async {
    final response = await _api.putJson(
      '/account/mobile/email',
      body: {
        'change_token': changeToken,
        'new_email': newEmail.trim().toLowerCase(),
      },
    );
    return ChangeEmailResponse.fromJson(
      response['data'] as Map<String, dynamic>,
    );
  }

  Future<ChangePasswordResponse> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    final response = await _api.putJson(
      '/account/mobile/password',
      body: {'current_password': currentPassword, 'new_password': newPassword},
    );
    return ChangePasswordResponse.fromJson(
      response['data'] as Map<String, dynamic>,
    );
  }

  Future<List<AccountSession>> listSessions() async {
    final response = await _api.getJson('/account/mobile/sessions');
    final data = response['data'] as Map<String, dynamic>;
    final items = data['items'] as List<dynamic>? ?? const [];
    return items
        .map((item) => AccountSession.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<int> revokeSession(String sessionId) async {
    final response = await _api.deleteJson(
      '/account/mobile/sessions/$sessionId',
    );
    return _revokedCount(response);
  }

  Future<int> revokeOtherSessions() async {
    final response = await _api.deleteJson('/account/mobile/sessions/others');
    return _revokedCount(response);
  }

  int _revokedCount(Map<String, dynamic> response) {
    final data = response['data'] as Map<String, dynamic>? ?? const {};
    return (data['revoked'] as num?)?.toInt() ?? 0;
  }
}
