import 'package:mobile/features/auth/domain/ph_address.dart';

/// Whether a beneficiary is signing up for themselves or on behalf of a group.
enum BeneficiaryKind { individual, organization }

extension BeneficiaryKindX on BeneficiaryKind {
  String get label => switch (this) {
    BeneficiaryKind.individual => 'Individual',
    BeneficiaryKind.organization => 'Organization',
  };
}

/// Beneficiary-specific answers collected on the details step.
///
/// The organization fields are presentation-only for now — the registration
/// payload has no place for them yet, so nothing here is sent to the server.
class BeneficiaryProfile {
  const BeneficiaryProfile({
    this.kind,
    this.organizationName = '',
    this.organizationType,
    this.organizationRole = '',
    this.organizationAddress = '',
    this.address = PhAddress.empty,
  });

  final BeneficiaryKind? kind;
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

  bool get organizationDetailsComplete =>
      organizationName.trim().isNotEmpty &&
      (organizationType?.isNotEmpty ?? false) &&
      organizationRole.trim().isNotEmpty &&
      organizationAddress.trim().isNotEmpty;

  bool get isComplete {
    if (kind == null) return false;
    return !isOrganization || organizationDetailsComplete;
  }

  BeneficiaryProfile copyWith({
    BeneficiaryKind? kind,
    String? organizationName,
    String? organizationType,
    String? organizationRole,
    String? organizationAddress,
    PhAddress? address,
  }) {
    return BeneficiaryProfile(
      kind: kind ?? this.kind,
      organizationName: organizationName ?? this.organizationName,
      organizationType: organizationType ?? this.organizationType,
      organizationRole: organizationRole ?? this.organizationRole,
      organizationAddress: organizationAddress ?? this.organizationAddress,
      address: address ?? this.address,
    );
  }

  /// Clears the organization answers when the beneficiary switches back to
  /// registering as an individual. The home address is kept.
  BeneficiaryProfile asIndividual() =>
      BeneficiaryProfile(kind: BeneficiaryKind.individual, address: address);
}
