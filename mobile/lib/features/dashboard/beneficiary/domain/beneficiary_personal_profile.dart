/// Personal information shown on the beneficiary's Edit Profile form —
/// deliberately separate from assistance details.
class BeneficiaryPersonalProfile {
  const BeneficiaryPersonalProfile({
    required this.firstName,
    required this.lastName,
    required this.email,
    required this.contactNumber,
    required this.address,
    required this.dateOfBirth,
    this.photoLabel,
  });

  final String firstName;
  final String lastName;
  final String email;
  final String contactNumber;
  final String address;
  final String dateOfBirth;

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

  BeneficiaryPersonalProfile copyWith({
    String? firstName,
    String? lastName,
    String? email,
    String? contactNumber,
    String? address,
    String? dateOfBirth,
    String? photoLabel,
  }) {
    return BeneficiaryPersonalProfile(
      firstName: firstName ?? this.firstName,
      lastName: lastName ?? this.lastName,
      email: email ?? this.email,
      contactNumber: contactNumber ?? this.contactNumber,
      address: address ?? this.address,
      dateOfBirth: dateOfBirth ?? this.dateOfBirth,
      photoLabel: photoLabel ?? this.photoLabel,
    );
  }
}
