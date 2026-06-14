class UclmDepartments {
  UclmDepartments._();

  static const names = [
    'College of Teacher Education',
    'College of Hospitality & Tourism Management',
    'College of Computer Studies',
    'College of Nursing',
    'College of Maritime',
    'College of Business Administration',
    'College of Customs Administration',
    'College of Bussines & Accountancy',
    'College of Engeneering',
    'Senior High Department',
  ];

  static const coursesByDepartment = {
    'College of Teacher Education': [
      'BSED - Bachelor of Secondary Education',
      'BEED - Bachelor of Elementary Education',
      'BTLEd - Bachelor of Technology and Livelihood Education',
    ],
    'College of Hospitality & Tourism Management': [
      'BSHM - Bachelor of Science in Hospitality Management',
      'BSTM - Bachelor of Science in Tourism Management',
    ],
    'College of Computer Studies': [
      'BSIT - Bachelor of Science in Information Technology',
      'BSCS - Bachelor of Science in Computer Science',
    ],
    'College of Nursing': [
      'BSN - Bachelor of Science in Nursing',
    ],
    'College of Maritime': [
      'BSMarE - Bachelor of Science in Marine Engineering',
      'BSMT - Bachelor of Science in Marine Transportation',
    ],
    'College of Business Administration': [
      'BSBA-Marketing - Bachelor of Science in Business Administration Major in Marketing',
      'BSBA-HRM - Bachelor of Science in Business Administration Major in HRM',
    ],
    'College of Customs Administration': [
      'BSCA - Bachelor of Science in Customs Administration',
    ],
    'College of Bussines & Accountancy': [
      'BSBA - Bachelor of Science in Business Administration',
      'BSA - Bachelor of Science in Accountancy',
    ],
    'College of Engeneering': [
      'BSCpE - Bachelor of Science in Computer Engineering',
      'BSEE - Bachelor of Science in Electrical Engineering',
      'BSCE - Bachelor of Science in Civil Engineering',
    ],
    'Senior High Department': [
      'STEM - Science, Technology, Engineering, and Mathematics',
      'ABM - Accountancy, Business, and Management',
      'HUMSS - Humanities and Social Sciences',
      'GAS - General Academic Strand',
      'ICT - Information and Communications Technology',
      'HE - Home Economics',
      'IA - Industrial Arts',
    ],
  };

  static List<String> coursesFor(String department) =>
      coursesByDepartment[department] ?? const [];

  /// Best-effort match of OCR-extracted text to a known department name.
  static String? matchDepartment(String extracted) {
    final normalized = extracted.trim().toLowerCase();
    if (normalized.isEmpty) return null;

    for (final name in names) {
      if (name.toLowerCase() == normalized) return name;
    }

    for (final name in names) {
      final lower = name.toLowerCase();
      if (lower.contains(normalized) || normalized.contains(lower)) return name;
    }

    return null;
  }

  /// Best-effort match of OCR-extracted text to a course under [department].
  static String? matchCourse(String department, String extracted) {
    final courses = coursesFor(department);
    if (courses.isEmpty) return null;

    final normalized = extracted.trim().toLowerCase();
    if (normalized.isEmpty) return null;

    for (final course in courses) {
      if (course.toLowerCase() == normalized) return course;
    }

    for (final course in courses) {
      final lower = course.toLowerCase();
      final abbreviation = lower.split(' - ').first;
      if (lower.contains(normalized) ||
          normalized.contains(lower) ||
          normalized.contains(abbreviation)) {
        return course;
      }
    }

    return null;
  }
}
