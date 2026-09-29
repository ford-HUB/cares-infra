import 'package:mobile/core/models/password_policy.dart';
import 'package:mobile/core/services/api_client.dart';

/// Reads the password rules the administrator set in the portal. The endpoint is
/// public because the sign-up form has to state the rules before anyone is signed in.
class PasswordPolicyApi {
  PasswordPolicyApi({ApiClient? client}) : _client = client ?? ApiClient();

  final ApiClient _client;

  /// Never throws: a form that cannot reach the API still needs rules to show, so a
  /// failed fetch falls back to the same defaults the server ships with.
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
