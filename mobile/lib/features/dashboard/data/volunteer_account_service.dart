import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/features/dashboard/domain/volunteer_account_profile.dart';

class VolunteerAccountService {
  VolunteerAccountService({ApiClient? apiClient}) : _api = apiClient ?? ApiClient();

  final ApiClient _api;

  Future<VolunteerAccountProfile> fetchAccount() async {
    final response = await _api.getJson('/onboarding/volunteer-account');
    final data = response['data'] as Map<String, dynamic>? ?? {};
    return VolunteerAccountProfile.fromJson(data);
  }

  Future<VolunteerAccountProfile> saveAccount(VolunteerAccountProfile profile) async {
    final response = await _api.putJson(
      '/onboarding/volunteer-account',
      body: profile.toRequestBody(
        department: profile.department,
        course: profile.course,
      ),
    );
    final data = response['data'] as Map<String, dynamic>? ?? {};
    return VolunteerAccountProfile.fromJson(data);
  }
}
