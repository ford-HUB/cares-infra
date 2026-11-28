import 'package:mobile/features/auth/domain/ph_address.dart';

enum BeneficiaryKind { individual, organization }

extension BeneficiaryKindX on BeneficiaryKind {
  String get label => switch (this) {
    BeneficiaryKind.individual => 'Individual',
    BeneficiaryKind.organization => 'Organization',
  };
}

/// Students verify school ID + face like volunteers: no director review, and
/// their Volunteer side opens.
enum BeneficiaryCategory { regular, student }

extension BeneficiaryCategoryX on BeneficiaryCategory {
  String get label => switch (this) {
    BeneficiaryCategory.regular => 'Regular',
    BeneficiaryCategory.student => 'Student',
  };
}

/// Organization fields are presentation-only; the payload has no place for them
/// yet.
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

  /// Null until picked; always null for an organization.
  final BeneficiaryCategory? category;
  final String organizationName;
  final String? organizationType;
  final String organizationRole;
  final String organizationAddress;

  /// Sent as [PhAddress.formatted] in `current_address`.
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

  /// Keeps the home address.
  BeneficiaryProfile asIndividual() => BeneficiaryProfile(
    kind: BeneficiaryKind.individual,
    category: category,
    address: address,
  );

  /// Drops the regular / student answer.
  BeneficiaryProfile asOrganization() => BeneficiaryProfile(
    kind: BeneficiaryKind.organization,
    organizationName: organizationName,
    organizationType: organizationType,
    organizationRole: organizationRole,
    organizationAddress: organizationAddress,
    address: address,
  );
}
