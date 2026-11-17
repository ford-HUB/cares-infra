import 'package:mobile/features/auth/domain/ph_address.dart';

/// Whether a beneficiary is signing up for themselves or on behalf of a group.
enum BeneficiaryKind { individual, organization }

extension BeneficiaryKindX on BeneficiaryKind {
  String get label => switch (this) {
    BeneficiaryKind.individual => 'Individual',
    BeneficiaryKind.organization => 'Organization',
  };
}

/// Whether an individual beneficiary signs up as a regular beneficiary or as a
/// UC student. A student verifies their school ID and face like a student
/// volunteer, so no director review is needed and their Volunteer side opens.
enum BeneficiaryCategory { regular, student }

extension BeneficiaryCategoryX on BeneficiaryCategory {
  String get label => switch (this) {
    BeneficiaryCategory.regular => 'Regular',
    BeneficiaryCategory.student => 'Student',
  };
}

/// Beneficiary-specific answers collected on the details step.
///
/// The organization fields are presentation-only for now — the registration
/// payload has no place for them yet, so nothing here is sent to the server.
class BeneficiaryProfile {
  const BeneficiaryProfile({
    this.kind,
    this.category,
    this.organizationName = '',
    this.organizationType,
    this.organizationRole = '',
    this.organizationAddress = '',
    this.address = PhAddress.empty,
  });

  final BeneficiaryKind? kind;

  /// Individuals only: regular or student. Null until picked, and always null
  /// for an organization.
  final BeneficiaryCategory? category;
  final String organizationName;
  final String? organizationType;
  final String organizationRole;
  final String organizationAddress;

  /// The beneficiary's own home address. Registration sends it as
  /// [PhAddress.formatted] in `current_address`.
  final PhAddress address;

  static const organizationTypes = [
    'Non-profit / NGO',
    "People's Organization",
    'School / Academic Institution',
    'Barangay / LGU Unit',
    'Religious Group',
    'Other',
  ];

  bool get isOrganization => kind == BeneficiaryKind.organization;

  bool get isIndividual => kind == BeneficiaryKind.individual;

  /// An individual signing up as a UC student — the ID + face scan path.
  bool get isStudent => isIndividual && category == BeneficiaryCategory.student;

  bool get organizationDetailsComplete =>
      organizationName.trim().isNotEmpty &&
      (organizationType?.isNotEmpty ?? false) &&
      organizationRole.trim().isNotEmpty &&
      organizationAddress.trim().isNotEmpty;

  bool get isComplete {
    if (kind == null) return false;
    if (isIndividual) return category != null;
    return organizationDetailsComplete;
  }

  BeneficiaryProfile copyWith({
    BeneficiaryKind? kind,
    BeneficiaryCategory? category,
    String? organizationName,
    String? organizationType,
    String? organizationRole,
    String? organizationAddress,
    PhAddress? address,
  }) {
    return BeneficiaryProfile(
      kind: kind ?? this.kind,
      category: category ?? this.category,
      organizationName: organizationName ?? this.organizationName,
      organizationType: organizationType ?? this.organizationType,
      organizationRole: organizationRole ?? this.organizationRole,
      organizationAddress: organizationAddress ?? this.organizationAddress,
      address: address ?? this.address,
    );
  }

  /// Clears the organization answers when the beneficiary switches back to
  /// registering as an individual. The home address is kept.
  BeneficiaryProfile asIndividual() => BeneficiaryProfile(
    kind: BeneficiaryKind.individual,
    category: category,
    address: address,
  );

  /// Switching to an organization drops the regular / student answer.
  BeneficiaryProfile asOrganization() => BeneficiaryProfile(
    kind: BeneficiaryKind.organization,
    organizationName: organizationName,
    organizationType: organizationType,
    organizationRole: organizationRole,
    organizationAddress: organizationAddress,
    address: address,
  );
}
