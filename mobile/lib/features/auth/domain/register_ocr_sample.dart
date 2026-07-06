import 'package:mobile/features/auth/domain/register_ocr_raw_parser.dart';

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
    required this.volunteerType,
    this.rawTextFront = '',
    this.rawTextBack = '',
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
  final String volunteerType;
  final String rawTextFront;
  final String rawTextBack;

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
    String? volunteerType,
    String? rawTextFront,
    String? rawTextBack,
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
      volunteerType: volunteerType ?? this.volunteerType,
      rawTextFront: rawTextFront ?? this.rawTextFront,
      rawTextBack: rawTextBack ?? this.rawTextBack,
    );
  }

  String get fullName =>
      '$firstname ${middleName.isEmpty ? '' : '$middleName '}$lastname'.trim();

  String get graduationDate =>
      '${graduationMonth.toString().padLeft(2, '0')}/'
      '${graduationDay.toString().padLeft(2, '0')}/'
      '$graduationYear';

  /// Backfills empty structured fields using raw OCR text from the API.
  RegisterOcrSample enrichFromRawText() {
    if (rawTextFront.isEmpty && rawTextBack.isEmpty) return this;

    final parsed = RegisterOcrRawParser.parse(rawTextFront, rawTextBack);
    return copyWith(
      firstname: firstname.trim().isNotEmpty ? null : parsed.firstname,
      lastname: lastname.trim().isNotEmpty ? null : parsed.lastname,
      middleName: middleName.trim().isNotEmpty ? null : parsed.middleName,
      gender: gender.trim().isNotEmpty ? null : parsed.gender,
      age: age > 0 ? null : (parsed.age > 0 ? parsed.age : null),
      currentAddress: RegisterOcrRawParser.preferAddress(
        currentAddress,
        parsed.currentAddress,
      ),
      phoneNumber: phoneNumber.trim().isNotEmpty ? null : parsed.phoneNumber,
      idNumber: idNumber.trim().isNotEmpty ? null : parsed.idNumber,
    );
  }

  /// Empty defaults before OCR extraction completes.
  static RegisterOcrSample empty({required String volunteerType}) {
    return RegisterOcrSample(
      firstname: '',
      lastname: '',
      middleName: '',
      gender: '',
      age: 0,
      currentAddress: '',
      phoneNumber: '',
      idNumber: '',
      departmentName: '',
      majorName: '',
      yearLevelName: '',
      graduationYear: 0,
      graduationMonth: 0,
      graduationDay: 0,
      volunteerType: volunteerType,
    );
  }

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
    majorName: 'BEED - Bachelor of Elementary Education',
    yearLevelName: '3rd Year',
    graduationYear: 2026,
    graduationMonth: 3,
    graduationDay: 15,
    volunteerType: 'STUDENT',
  );

  /// Suggested email for the account step (static OCR preview).
  static const suggestedEmail = 'maria.santos@student.uclm.edu.ph';
}
