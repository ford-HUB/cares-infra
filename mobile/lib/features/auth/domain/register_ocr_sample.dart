/// Static sample data mirroring server [CreateUserSchema] for OCR preview UI.
class RegisterOcrSample {
  const RegisterOcrSample({
    required this.firstname,
    required this.lastname,
    required this.middleName,
    required this.gender,
    required this.age,
    required this.currentAddress,
    required this.phoneNumber,
    required this.idNumber,
    required this.departmentName,
    required this.majorName,
    required this.yearLevelName,
    required this.graduationYear,
    required this.graduationMonth,
    required this.graduationDay,
    required this.roleType,
  });

  final String firstname;
  final String lastname;
  final String middleName;
  final String gender;
  final int age;
  final String currentAddress;
  final String phoneNumber;
  final String idNumber;
  final String departmentName;
  final String majorName;
  final String yearLevelName;
  final int graduationYear;
  final int graduationMonth;
  final int graduationDay;
  final String roleType;

  RegisterOcrSample copyWith({
    String? firstname,
    String? lastname,
    String? middleName,
    String? gender,
    int? age,
    String? currentAddress,
    String? phoneNumber,
    String? idNumber,
    String? departmentName,
    String? majorName,
    String? yearLevelName,
    int? graduationYear,
    int? graduationMonth,
    int? graduationDay,
    String? roleType,
  }) {
    return RegisterOcrSample(
      firstname: firstname ?? this.firstname,
      lastname: lastname ?? this.lastname,
      middleName: middleName ?? this.middleName,
      gender: gender ?? this.gender,
      age: age ?? this.age,
      currentAddress: currentAddress ?? this.currentAddress,
      phoneNumber: phoneNumber ?? this.phoneNumber,
      idNumber: idNumber ?? this.idNumber,
      departmentName: departmentName ?? this.departmentName,
      majorName: majorName ?? this.majorName,
      yearLevelName: yearLevelName ?? this.yearLevelName,
      graduationYear: graduationYear ?? this.graduationYear,
      graduationMonth: graduationMonth ?? this.graduationMonth,
      graduationDay: graduationDay ?? this.graduationDay,
      roleType: roleType ?? this.roleType,
    );
  }

  String get fullName =>
      '$firstname ${middleName.isEmpty ? '' : '$middleName '}$lastname'.trim();

  String get graduationDate =>
      '${graduationMonth.toString().padLeft(2, '0')}/'
      '${graduationDay.toString().padLeft(2, '0')}/'
      '$graduationYear';

  /// Plausible UCLM student ID OCR preview.
  static const sample = RegisterOcrSample(
    firstname: 'Maria',
    lastname: 'Santos',
    middleName: 'L.',
    gender: 'FEMALE',
    age: 20,
    currentAddress: 'Looc, Mandaue City, Cebu',
    phoneNumber: '+639171234567',
    idNumber: '2021-08452',
    departmentName: 'College of Teacher Education',
    majorName: 'Bachelor of Elementary Education',
    yearLevelName: '3rd Year',
    graduationYear: 2026,
    graduationMonth: 3,
    graduationDay: 15,
    roleType: 'VOLUNTEER',
  );

  /// Suggested email for the account step (static OCR preview).
  static const suggestedEmail = 'maria.santos@student.uclm.edu.ph';
}
