import 'package:flutter/foundation.dart';

import '../../../../core/session/static_user_session.dart';
import '../domain/beneficiary_personal_profile.dart';

/// In-memory prototype store.
class BeneficiaryPersonalProfileStore extends ChangeNotifier {
  BeneficiaryPersonalProfileStore._();

  static final BeneficiaryPersonalProfileStore instance =
      BeneficiaryPersonalProfileStore._();

  BeneficiaryPersonalProfile? _profile;

  /// Seeded from the session on first read.
  BeneficiaryPersonalProfile get profile {
    return _profile ??= _seedFromSession();
  }

  BeneficiaryPersonalProfile _seedFromSession() {
    final user = StaticUserSession.instance.currentUser;
    return BeneficiaryPersonalProfile(
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      email: user?.email ?? 'beneficiary@cares.local',
      contactNumber: user?.phoneNumber ?? '',
      address: '',
      dateOfBirth: '',
    );
  }

  BeneficiaryPersonalProfile save(BeneficiaryPersonalProfile profile) {
    _profile = profile;
    notifyListeners();
    return profile;
  }
}
