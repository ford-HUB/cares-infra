import 'package:mobile/core/models/password_policy.dart';
import 'package:mobile/core/services/api_client.dart';

/// Public endpoint: sign-up must state the rules before sign-in.
class PasswordPolicyApi {
  PasswordPolicyApi({ApiClient? client}) : _client = client ?? ApiClient();

  final ApiClient _client;

  /// Never throws; falls back to the server's shipped defaults.
  Future<PasswordPolicy> fetchPolicy() async {
    try {
      final response = await _client.getJson(
        '/security-policy/password-rules',
        authenticate: false,
      );
      final data = response['data'];
      if (data is Map<String, dynamic>) {
        return PasswordPolicy.fromJson(data);
      }
      return PasswordPolicy.fallback;
    } catch (_) {
      return PasswordPolicy.fallback;
    }
  }
}
