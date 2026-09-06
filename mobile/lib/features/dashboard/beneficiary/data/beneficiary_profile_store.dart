import 'package:flutter/foundation.dart';

import '../domain/beneficiary_profile.dart';

/// In-memory beneficiary profile store for the static prototype phase — the
/// volunteer side talks to an API service, the beneficiary side keeps mock
/// state locally.
class BeneficiaryProfileStore extends ChangeNotifier {
  BeneficiaryProfileStore._();

  static final BeneficiaryProfileStore instance = BeneficiaryProfileStore._();

  BeneficiaryProfile _profile = BeneficiaryProfile.empty();

  BeneficiaryProfile get profile => _profile;

  bool get isComplete => _profile.profileComplete;

  BeneficiaryProfile save(BeneficiaryProfile profile) {
    _profile = profile;
    notifyListeners();
    return _profile;
  }
}
