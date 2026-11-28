import 'package:mobile/core/session/role_account_store.dart';
import 'package:mobile/features/dashboard/data/mobile_profile_models.dart';
import 'package:mobile/features/dashboard/data/profile_service.dart';
import 'package:mobile/features/dashboard/domain/volunteer_profile.dart';
import 'package:mobile/features/interests/data/interests_service.dart';

/// Reads via `GET /profile/me/mobile` (also fills [RoleAccountStore]);
/// interests are written with `PUT /interests`.
class VolunteerProfileService {
  VolunteerProfileService({
    ProfileService? profileService,
    InterestsService? interestsService,
  }) : _profileService = profileService ?? ProfileService(),
       _interestsService = interestsService ?? InterestsService();

  final ProfileService _profileService;
  final InterestsService _interestsService;

  Future<List<InterestCatalogItem>> fetchInterestCatalog() {
    return _interestsService.fetchInterests();
  }

  Future<VolunteerProfile> fetchProfile() async {
    // Signed-out prototype paths have nothing to read.
    final profile = await _profileService.syncRoleAccount(
      roleType: RoleAccountStore.volunteer,
    );
    if (profile == null) return VolunteerProfile.empty();
    await _dropSchoolCommunityInterests(profile);
    return _fromMobileProfile(profile);
  }

  /// Director-approved outside volunteers lose a saved School interest; an
  /// empty remainder is left so the picker prompts again.
  Future<void> _dropSchoolCommunityInterests(MobileProfile profile) async {
    final volunteer = profile.volunteer;
    if (volunteer == null) return;
    final allowed = volunteer.allowedInterests;
    if (allowed.length == volunteer.interests.length || allowed.isEmpty) {
      return;
    }
    await _interestsService.saveInterests(interests: allowed);
  }

  /// Re-reads so `profileComplete` is the server's answer.
  Future<VolunteerProfile> saveProfile(VolunteerProfile profile) async {
    await _interestsService.saveInterests(interests: profile.interests);
    return fetchProfile();
  }

  VolunteerProfile _fromMobileProfile(MobileProfile profile) {
    return VolunteerProfile(
      interests: profile.volunteer?.allowedInterests ?? const {},
      profileComplete: profile.completion.complete,
    );
  }
}
