/// Volunteer sub-type within registration — matches uclmcares.online guest portal.
enum VolunteerType { student, staff, alumni, partnerBarangay }

extension VolunteerTypeX on VolunteerType {
  String get label => switch (this) {
    VolunteerType.student => 'Student',
    VolunteerType.staff => 'Staff',
    VolunteerType.alumni => 'Alumni',
    VolunteerType.partnerBarangay => 'Partner Barangay',
  };

  String get apiValue => switch (this) {
    VolunteerType.student => 'STUDENT',
    VolunteerType.staff => 'STAFF',
    VolunteerType.alumni => 'ALUMNI',
    VolunteerType.partnerBarangay => 'PARTNER_BARANGAY',
  };

  /// Sign-ups whose ID a director reviews instead of it being face matched and
  /// read by OCR: the details are typed in and the account waits for approval.
  bool get isDirectorReviewed =>
      this == VolunteerType.alumni || this == VolunteerType.partnerBarangay;

  static VolunteerType? fromApiValue(String? value) {
    if (value == null || value.isEmpty) return null;
    final normalized = value.trim().toUpperCase();
    return switch (normalized) {
      'STUDENT' => VolunteerType.student,
      'STAFF' => VolunteerType.staff,
      'ALUMNI' => VolunteerType.alumni,
      'PARTNER_BARANGAY' => VolunteerType.partnerBarangay,
      _ => null,
    };
  }
}
