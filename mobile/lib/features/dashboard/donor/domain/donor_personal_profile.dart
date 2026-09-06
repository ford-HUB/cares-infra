/// Personal and contact information shown on the donor's Edit Profile form.
/// Donors are not identity-verified, so no IDs or verification documents are
/// collected here.
class DonorPersonalProfile {
  const DonorPersonalProfile({
    required this.firstName,
    required this.lastName,
    required this.email,
    required this.contactNumber,
    required this.address,
    required this.organization,
    this.photoLabel,
  });

  final String firstName;
  final String lastName;
  final String email;
  final String contactNumber;
  final String address;

  /// Optional company or group the donor gives on behalf of.
  final String organization;

  /// Mock stand-in for an uploaded photo (no file storage in the prototype).
  final String? photoLabel;

  String get fullName {
    final parts = [
      firstName.trim(),
      lastName.trim(),
    ].where((part) => part.isNotEmpty);
    return parts.join(' ');
  }

  String get initial {
    final name = fullName.trim();
    return name.isEmpty ? '?' : name[0].toUpperCase();
  }

  DonorPersonalProfile copyWith({
    String? firstName,
    String? lastName,
    String? email,
    String? contactNumber,
    String? address,
    String? organization,
    String? photoLabel,
  }) {
    return DonorPersonalProfile(
      firstName: firstName ?? this.firstName,
      lastName: lastName ?? this.lastName,
      email: email ?? this.email,
      contactNumber: contactNumber ?? this.contactNumber,
      address: address ?? this.address,
      organization: organization ?? this.organization,
      photoLabel: photoLabel ?? this.photoLabel,
    );
  }
}
