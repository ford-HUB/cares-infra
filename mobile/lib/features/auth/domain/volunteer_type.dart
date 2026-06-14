/// Volunteer sub-type within registration — matches uclmcares.online guest portal.
enum VolunteerType {
  student,
  staff,
  alumni,
}

extension VolunteerTypeX on VolunteerType {
  String get label => switch (this) {
        VolunteerType.student => 'Student',
        VolunteerType.staff => 'Staff',
        VolunteerType.alumni => 'Alumni',
      };

  String get apiValue => switch (this) {
        VolunteerType.student => 'STUDENT',
        VolunteerType.staff => 'STAFF',
        VolunteerType.alumni => 'ALUMNI',
      };

  static VolunteerType? fromApiValue(String? value) {
    if (value == null || value.isEmpty) return null;
    final normalized = value.trim().toUpperCase();
    return switch (normalized) {
      'STUDENT' => VolunteerType.student,
      'STAFF' => VolunteerType.staff,
      'ALUMNI' => VolunteerType.alumni,
      _ => null,
    };
  }
}
