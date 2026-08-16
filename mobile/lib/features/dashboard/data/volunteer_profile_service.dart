import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/features/dashboard/domain/volunteer_profile.dart';
import 'package:mobile/features/onboarding/data/onboarding_service.dart';

class VolunteerProfileService {
  VolunteerProfileService({
    ApiClient? apiClient,
    OnboardingService? onboardingService,
  })  : _api = apiClient ?? ApiClient(),
        _onboardingService = onboardingService ?? OnboardingService();

  final ApiClient _api;
  final OnboardingService _onboardingService;

  Future<List<InterestCatalogItem>> fetchInterestCatalog() {
    return _onboardingService.fetchInterests();
  }

  Future<VolunteerProfile> fetchProfile() async {
    final response = await _api.getJson('/onboarding/volunteer-profile');
    final data = response['data'] as Map<String, dynamic>? ?? {};
    return VolunteerProfile.fromJson(data);
  }

  Future<VolunteerProfile> saveProfile(VolunteerProfile profile) async {
    final response = await _api.putJson(
      '/onboarding/volunteer-profile',
      body: profile.toRequestBody(),
    );
    final data = response['data'] as Map<String, dynamic>? ?? {};
    return VolunteerProfile.fromJson(data);
  }
}
