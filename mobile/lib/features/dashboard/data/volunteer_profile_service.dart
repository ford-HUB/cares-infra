import 'package:mobile/core/session/role_account_store.dart';
import 'package:mobile/features/dashboard/data/mobile_profile_models.dart';
import 'package:mobile/features/dashboard/data/profile_service.dart';
import 'package:mobile/features/dashboard/domain/volunteer_profile.dart';
import 'package:mobile/features/interests/data/interests_service.dart';

/// The volunteer's own profile as the dashboard needs it: the interests on
/// file plus the server's verdict on whether the record is complete.
///
/// Reads go through `GET /profile/me/mobile` (which also fills
/// [RoleAccountStore]); interests are written with `PUT /interests`.
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
    return _fromMobileProfile(profile);
  }

  /// Saves the interests, then re-reads so `profileComplete` is the server's
  /// answer rather than an assumption made on the device.
  Future<VolunteerProfile> saveProfile(VolunteerProfile profile) async {
    await _interestsService.saveInterests(interests: profile.interests);
    return fetchProfile();
  }

  VolunteerProfile _fromMobileProfile(MobileProfile profile) {
    return VolunteerProfile(
      interests: profile.volunteer?.interests ?? const {},
      profileComplete: profile.completion.complete,
    );
  }
}
