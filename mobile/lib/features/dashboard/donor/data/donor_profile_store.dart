import 'package:flutter/foundation.dart';

import '../../../../core/session/donor_session.dart';
import '../domain/donor_personal_profile.dart';
import '../domain/donor_profile.dart';

/// In-memory donor interest profile for the static prototype phase.
class DonorProfileStore extends ChangeNotifier {
  DonorProfileStore._();

  static final DonorProfileStore instance = DonorProfileStore._();

  DonorProfile _profile = DonorProfile.empty();

  DonorProfile get profile => _profile;

  bool get isComplete => _profile.profileComplete;

  DonorProfile save(DonorProfile profile) {
    _profile = profile;
    notifyListeners();
    return _profile;
  }
}

/// In-memory donor personal/contact details for the static prototype phase.
class DonorPersonalProfileStore extends ChangeNotifier {
  DonorPersonalProfileStore._();

  static final DonorPersonalProfileStore instance =
      DonorPersonalProfileStore._();

  DonorPersonalProfile? _profile;

  /// Seeded from the signed-in donor the first time it is read.
  DonorPersonalProfile get profile => _profile ??= _seedFromSession();

  DonorPersonalProfile _seedFromSession() {
    final donor = DonorSession.instance.currentDonor;
    return DonorPersonalProfile(
      firstName: donor?.firstName ?? '',
      lastName: donor?.lastName ?? '',
      email: donor?.email ?? 'donor@cares.local',
      contactNumber: '',
      address: '',
      organization: '',
    );
  }

  DonorPersonalProfile save(DonorPersonalProfile profile) {
    _profile = profile;
    notifyListeners();
    return profile;
  }
}
