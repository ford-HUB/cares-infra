class UclmDepartments {
  UclmDepartments._();

  /// Staff, not students — no year level or graduation year applies.
  static const nonTeaching = 'Non-Teaching Personnel';

  static const names = [
    'College of Maritime Engineering',
    'College of Teacher Education (BSED)',
    'College of Maritime Transportation',
    'College of Nursing',
    'Senior High School Department',
    'College of Teacher Education (BEED)',
    'College of Business and Accountancy',
    'College of Computer Studies',
    'College of Criminology',
    'College of Customs Administration',
    'College of Engineering',
    'College of Hospitality and Tourism Management',
    'Basic Education (Junior High School)',
    'Basic Education (Elementary)',
    'Non-Teaching Personnel',
  ];

  static const coursesByDepartment = {
    'College of Maritime Engineering': [
      'BSMarE - Bachelor of Science in Marine Engineering',
    ],
    'College of Teacher Education (BSED)': [
      'BSED - Bachelor of Secondary Education',
    ],
    'College of Maritime Transportation': [
      'BSMT - Bachelor of Science in Marine Transportation',
    ],
    'College of Nursing': ['BSN - Bachelor of Science in Nursing'],
    'Senior High School Department': ['SHS - Senior High School'],
    'College of Teacher Education (BEED)': [
      'BEED - Bachelor of Elementary Education',
    ],
    'College of Business and Accountancy': [
      'BSA - Bachelor of Science in Accountancy',
      'BSBA - Bachelor of Science in Business Administration',
      'BSMA - Bachelor of Science in Management Accounting',
    ],
    'College of Computer Studies': [
      'BSIT - Bachelor of Science in Information Technology',
      'BSCS - Bachelor of Science in Computer Science',
    ],
    'College of Criminology': ['BSCrim - Bachelor of Science in Criminology'],
    'College of Customs Administration': [
      'BSCA - Bachelor of Science in Customs Administration',
    ],
    'College of Engineering': [
      'BSCE - Bachelor of Science in Civil Engineering',
      'BSEE - Bachelor of Science in Electrical Engineering',
      'BSECE - Bachelor of Science in Electronics Engineering',
      'BSME - Bachelor of Science in Mechanical Engineering',
      'BSIE - Bachelor of Science in Industrial Engineering',
      'BSCpE - Bachelor of Science in Computer Engineering',
    ],
    'College of Hospitality and Tourism Management': [
      'BSHM - Bachelor of Science in Hospitality Management',
      'BSTM - Bachelor of Science in Tourism Management',
    ],
    'Basic Education (Junior High School)': ['JHS - Junior High School'],
    'Basic Education (Elementary)': ['ES - Elementary School'],
    'Non-Teaching Personnel': ['NT - Non-Teaching Personnel'],
  };

  /// Grade levels for the basic-education departments, which use grades instead
  /// of the college year levels.
  static const gradeLevelsByDepartment = {
    'Senior High School Department': ['Grade 11', 'Grade 12'],
    'Basic Education (Junior High School)': [
      'Grade 7',
      'Grade 8',
      'Grade 9',
      'Grade 10',
    ],
    'Basic Education (Elementary)': [
      'Grade 1',
      'Grade 2',
      'Grade 3',
      'Grade 4',
      'Grade 5',
      'Grade 6',
    ],
  };

  static List<String> coursesFor(String department) =>
      coursesByDepartment[department] ?? const [];

  /// Grade levels for a basic-education department, or null for a college.
  static List<String>? gradeLevelsFor(String? department) =>
      gradeLevelsByDepartment[department];

  static bool isNonTeaching(String? department) =>
      department?.trim() == nonTeaching;

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
