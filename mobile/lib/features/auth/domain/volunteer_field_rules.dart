import 'package:mobile/features/auth/domain/volunteer_type.dart';

/// Field rules for the volunteer details form. Shared by the form (inline
/// errors) and the registration flow (Continue gating) so both agree.
abstract final class VolunteerFieldRules {
  static const minAge = 15;
  static const maxAge = 80;

  /// Students enter an expected graduation year, at most this many years out.
  static const maxYearsUntilGraduation = 6;

  /// Earliest graduation year accepted for alumni.
  static const earliestAlumniYear = 1950;

  static String? ageError(String raw) {
    final text = raw.trim();
    if (text.isEmpty) return 'Age is required';
    final age = int.tryParse(text);
    if (age == null || age < minAge || age > maxAge) {
      return 'Enter an age between $minAge and $maxAge';
    }
    return null;
  }

  static String? graduationYearError(String raw, VolunteerType type) {
    final text = raw.trim();
    if (text.isEmpty) return 'Graduation year is required';
    final year = int.tryParse(text);
    if (year == null || text.length != 4) return 'Enter a 4-digit year';

    final currentYear = DateTime.now().year;
    switch (type) {
      case VolunteerType.student:
        final latest = currentYear + maxYearsUntilGraduation;
        if (year < currentYear || year > latest) {
          return 'Enter a year from $currentYear to $latest';
        }
      case VolunteerType.alumni:
        if (year < earliestAlumniYear || year > currentYear) {
          return 'Enter a year from $earliestAlumniYear to $currentYear';
        }
      case VolunteerType.staff:
        break;
    }
    return null;
  }

  static bool isValidAge(int age) => ageError('$age') == null;

  static bool isValidGraduationYear(int year, VolunteerType type) =>
      graduationYearError(year > 0 ? '$year' : '', type) == null;
}
