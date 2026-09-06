import 'package:flutter/foundation.dart';

import '../../../../core/session/static_user_session.dart';
import '../domain/beneficiary_personal_profile.dart';

/// In-memory personal / verification profile for the static prototype phase.
class BeneficiaryPersonalProfileStore extends ChangeNotifier {
  BeneficiaryPersonalProfileStore._();

  static final BeneficiaryPersonalProfileStore instance =
      BeneficiaryPersonalProfileStore._();

  BeneficiaryPersonalProfile? _profile;

  /// Seeded from the signed-in session the first time it is read.
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
      documents: defaultVerificationDocuments(),
    );
  }

  BeneficiaryPersonalProfile save(BeneficiaryPersonalProfile profile) {
    _profile = profile;
    notifyListeners();
    return profile;
  }

  /// Whether the beneficiary may join events yet.
  BeneficiaryVerificationState get verificationState =>
      profile.verificationState;

  bool get canJoinEvents => profile.canJoinEvents;

  /// Mock upload — marks a document as submitted and awaiting review.
  void submitDocument(String documentId, String fileName) {
    _updateDocument(
      documentId,
      (doc) => doc.copyWith(
        status: VerificationDocumentStatus.pending,
        fileName: fileName,
        submittedOn: DateTime.now(),
        clearRejectionReason: true,
      ),
    );
  }

  /// Mock review outcomes — a reviewer performs these on the CARES side.
  void markVerified(String documentId) {
    _updateDocument(
      documentId,
      (doc) => doc.copyWith(
        status: VerificationDocumentStatus.verified,
        clearRejectionReason: true,
      ),
    );
  }

  void markRejected(String documentId, String reason) {
    _updateDocument(
      documentId,
      (doc) => doc.copyWith(
        status: VerificationDocumentStatus.rejected,
        rejectionReason: reason,
      ),
    );
  }

  void _updateDocument(
    String documentId,
    VerificationDocument Function(VerificationDocument) transform,
  ) {
    final current = profile;
    final updated = current.documents
        .map((doc) => doc.id == documentId ? transform(doc) : doc)
        .toList();
    _profile = current.copyWith(documents: updated);
    notifyListeners();
  }
}
