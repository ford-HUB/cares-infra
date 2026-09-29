import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/features/auth/data/models/password_reset_models.dart';

/// The three calls behind "forgot password": mail a code, trade the code for a
/// reset token, then write the new password with that token.
class PasswordResetService {
  PasswordResetService({ApiClient? apiClient})
    : _api = apiClient ?? ApiClient();

  final ApiClient _api;

  Future<PasswordResetRequestResponse> requestCode({
    required String email,
  }) async {
    final response = await _api.postJson(
      '/auth/forgot-password',
      authenticate: false,
      body: {'email': email.trim().toLowerCase()},
    );

    return PasswordResetRequestResponse.fromJson(
      response['data'] as Map<String, dynamic>,
    );
  }

  Future<PasswordResetTokenResponse> verifyCode({
    required String email,
    required String otp,
  }) async {
    final response = await _api.postJson(
      '/auth/verify-reset-otp',
      authenticate: false,
      body: {'email': email.trim().toLowerCase(), 'otp': otp.trim()},
    );

    return PasswordResetTokenResponse.fromJson(
      response['data'] as Map<String, dynamic>,
    );
  }

  Future<void> resetPassword({
    required String email,
    required String resetToken,
    required String newPassword,
  }) async {
    await _api.postJson(
      '/auth/reset-password',
      authenticate: false,
      body: {
        'email': email.trim().toLowerCase(),
        'resetToken': resetToken,
        'newPassword': newPassword,
      },
    );
  }
}
