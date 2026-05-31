const List<String> kYearLevels = [
  '1st Year',
  '2nd Year',
  '3rd Year',
  '4th Year',
];

const Map<String, List<String>> kDepartmentCourses = {
  'College of Engineering': [
    'BS Computer Science',
    'BS Information Technology',
    'BS Computer Engineering',
  ],
  'College of Business': [
    'BS Business Administration',
    'BS Accountancy',
    'BS Entrepreneurship',
  ],
  'College of Arts and Sciences': [
    'BA Communication',
    'BS Psychology',
    'BS Biology',
  ],
  'College of Education': [
    'BEEd General Education',
    'BSEd Mathematics',
    'BSEd English',
  ],
  'College of Nursing': ['BS Nursing'],
};

List<String> coursesForDepartment(String? department) {
  if (department == null) return [];
  return kDepartmentCourses[department] ?? [];
}
