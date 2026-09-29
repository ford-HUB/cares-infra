/// The signed-in donor for the current app run.
class DonorSessionUser {
  DonorSessionUser({
    required this.firstName,
    required this.middleName,
    required this.lastName,
    required this.email,
    this.userId,
    this.phoneNumber = '',
    this.address = '',
    this.avatarUrl,
  });

  /// The CARES `user_id`. Null only for the local prototype paths that still create a
  /// donor without a server account.
  final String? userId;
  final String firstName;
  final String middleName;
  final String lastName;
  final String email;
  final String phoneNumber;
  final String address;
  final String? avatarUrl;

  bool get isServerBacked => userId != null && userId!.isNotEmpty;

  String get fullName {
    final parts = [
      firstName.trim(),
      if (middleName.trim().isNotEmpty) middleName.trim(),
      lastName.trim(),
    ].where((part) => part.isNotEmpty);
    return parts.join(' ');
  }
}

/// In-memory donor session, cleared when the app restarts.
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
