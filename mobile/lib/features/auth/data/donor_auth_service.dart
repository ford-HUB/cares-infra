import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/features/auth/data/models/donor_auth_models.dart';
import 'package:mobile/features/auth/data/models/login_api_models.dart';
import 'package:mobile/features/auth/data/social_auth_client.dart';

/// The CARES half of donor social sign-in: hands a provider token to the server and
/// takes back either a session or a ticket to finish sign-up with.
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

  /// Spends [oauthTicket] to create the donor. The email is not sent: the server takes
  /// it from the ticket, so it is always the address the provider vouched for.
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
        'phone_number': phoneNumber.trim(),
        'current_address': address.trim(),
      },
    );

    return LoginResponse.fromJson(response['data'] as Map<String, dynamic>);
  }
}
