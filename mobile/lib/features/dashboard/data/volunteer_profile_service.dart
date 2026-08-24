import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/features/dashboard/domain/volunteer_profile.dart';
import 'package:mobile/features/interests/data/interests_service.dart';

class VolunteerProfileService {
  VolunteerProfileService({
    ApiClient? apiClient,
    InterestsService? interestsService,
  })  : _api = apiClient ?? ApiClient(),
        _interestsService = interestsService ?? InterestsService();

  final ApiClient _api;
  final InterestsService _interestsService;

  Future<List<InterestCatalogItem>> fetchInterestCatalog() {
    return _interestsService.fetchInterests();
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
