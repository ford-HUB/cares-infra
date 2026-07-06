import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/features/auth/data/models/login_api_models.dart';

class AuthLoginService {
  AuthLoginService({ApiClient? apiClient}) : _api = apiClient ?? ApiClient();

  final ApiClient _api;

  Future<LoginResponse> login({
    required String email,
    required String password,
  }) async {
    final response = await _api.postJson(
      '/auth/login',
      authenticate: false,
      body: {
        'email': email.trim().toLowerCase(),
        'password': password,
      },
    );

    return LoginResponse.fromJson(response['data'] as Map<String, dynamic>);
  }
}
