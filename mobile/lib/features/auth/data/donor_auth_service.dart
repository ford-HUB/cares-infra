import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/core/utils/phone_number_format.dart';
import 'package:mobile/features/auth/data/models/donor_auth_models.dart';
import 'package:mobile/features/auth/data/models/login_api_models.dart';
import 'package:mobile/features/auth/data/social_auth_client.dart';

/// Returns a session, or a ticket to finish sign-up with.
class DonorAuthService {
  DonorAuthService({ApiClient? apiClient}) : _api = apiClient ?? ApiClient();

  final ApiClient _api;

  Future<DonorOAuthResult> exchangeProviderToken(SocialAuthToken token) async {
    final response = await _api.postJson(
      '/auth/donor/oauth',
      authenticate: false,
      body: {'provider': token.apiProvider, 'token': token.token},
    );

    return DonorOAuthResult.fromJson(response['data'] as Map<String, dynamic>);
  }

  /// The email isn't sent: the server takes it from the ticket.
  Future<LoginResponse> registerDonor({
    required String oauthTicket,
    required String firstName,
    required String middleName,
    required String lastName,
    required String phoneNumber,
    required String address,
  }) async {
    final response = await _api.postJson(
      '/auth/donor/register',
      authenticate: false,
      body: {
        'oauth_ticket': oauthTicket,
        'firstname': firstName.trim(),
        'middle_name': middleName.trim(),
        'lastname': lastName.trim(),
        'phone_number': normalizePhilippinePhone(phoneNumber),
        'current_address': address.trim(),
      },
    );

    return LoginResponse.fromJson(response['data'] as Map<String, dynamic>);
  }

  /// The server refuses it unless the address passed the shared OTP check.
  Future<LoginResponse> registerDonorWithEmail({
    required String email,
    required String password,
    required String firstName,
    required String middleName,
    required String lastName,
    required String phoneNumber,
    required String address,
  }) async {
    final response = await _api.postJson(
      '/auth/donor/register-email',
      authenticate: false,
      body: {
        'email': email.trim(),
        'password': password,
        'firstname': firstName.trim(),
        'middle_name': middleName.trim(),
        'lastname': lastName.trim(),
        'phone_number': normalizePhilippinePhone(phoneNumber),
        'current_address': address.trim(),
      },
    );

    return LoginResponse.fromJson(response['data'] as Map<String, dynamic>);
  }
}
