/// In-memory donor record for the local-only donor prototype phase.
class DonorSessionUser {
  DonorSessionUser({
    required this.firstName,
    required this.middleName,
    required this.lastName,
    required this.email,
    required this.password,
  });

  final String firstName;
  final String middleName;
  final String lastName;
  final String email;
  final String password;

  String get fullName {
    final parts = [
      firstName.trim(),
      if (middleName.trim().isNotEmpty) middleName.trim(),
      lastName.trim(),
    ].where((part) => part.isNotEmpty);
    return parts.join(' ');
  }
}

/// Temporary in-memory session for donor accounts (no backend yet).
class DonorSession {
  DonorSession._();

  static final DonorSession instance = DonorSession._();

  DonorSessionUser? currentDonor;

  void register(DonorSessionUser donor) {
    currentDonor = donor;
  }

  void signOut() {
    currentDonor = null;
  }
}
