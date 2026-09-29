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
    await _dropSchoolCommunityInterests(profile);
    return _fromMobileProfile(profile);
  }

  /// A donor / beneficiary whose Volunteer role a director approved is from
  /// outside the school community. If they saved the School interest before
  /// the approval, write the set back without it so the server matches what
  /// the app shows. An empty remainder is left alone — the picker prompts
  /// again instead of saving nothing.
  Future<void> _dropSchoolCommunityInterests(MobileProfile profile) async {
    final volunteer = profile.volunteer;
    if (volunteer == null) return;
    final allowed = volunteer.allowedInterests;
    if (allowed.length == volunteer.interests.length || allowed.isEmpty) {
      return;
    }
    await _interestsService.saveInterests(interests: allowed);
  }

  /// Saves the interests, then re-reads so `profileComplete` is the server's
  /// answer rather than an assumption made on the device.
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
