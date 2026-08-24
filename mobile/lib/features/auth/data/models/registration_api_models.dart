import 'package:mobile/features/auth/domain/register_ocr_raw_parser.dart';
import 'package:mobile/features/auth/domain/register_ocr_sample.dart';

class SendVerificationResponse {
  const SendVerificationResponse({
    required this.email,
    required this.sent,
    required this.reused,
    required this.verified,
    required this.expiresInSeconds,
  });

  factory SendVerificationResponse.fromJson(Map<String, dynamic> json) {
    return SendVerificationResponse(
      email: json['email'] as String? ?? '',
      sent: json['sent'] as bool? ?? true,
      reused: json['reused'] as bool? ?? false,
      verified: json['verified'] as bool? ?? false,
      expiresInSeconds: (json['expiresInSeconds'] as num?)?.toInt() ?? 0,
    );
  }

  final String email;
  final bool sent;
  final bool reused;
  final bool verified;
  final int expiresInSeconds;
}

class VerificationStatusResponse {
  const VerificationStatusResponse({
    required this.email,
    required this.hasActiveCode,
    required this.verified,
    required this.expiresInSeconds,
  });

  factory VerificationStatusResponse.fromJson(Map<String, dynamic> json) {
    return VerificationStatusResponse(
      email: json['email'] as String? ?? '',
      hasActiveCode: json['hasActiveCode'] as bool? ?? false,
      verified: json['verified'] as bool? ?? false,
      expiresInSeconds: (json['expiresInSeconds'] as num?)?.toInt() ?? 0,
    );
  }

  final String email;
  final bool hasActiveCode;
  final bool verified;
  final int expiresInSeconds;
}

class UploadIdResponse {
  const UploadIdResponse({required this.registrationId});

  factory UploadIdResponse.fromJson(Map<String, dynamic> json) {
    return UploadIdResponse(registrationId: json['registrationId'] as String);
  }

  final String registrationId;
}

class VerifyFaceResponse {
  const VerifyFaceResponse({
    required this.registrationId,
    required this.match,
    required this.similarity,
    required this.threshold,
    required this.step,
    required this.message,
  });

  factory VerifyFaceResponse.fromJson(Map<String, dynamic> json) {
    return VerifyFaceResponse(
      registrationId: json['registrationId'] as String,
      match: json['match'] as bool,
      similarity: (json['similarity'] as num).toDouble(),
      threshold: (json['threshold'] as num?)?.toDouble() ?? 0.4,
      step: json['step'] as String,
      message: json['message'] as String? ?? '',
    );
  }

  final String registrationId;
  final bool match;
  final double similarity;
  final double threshold;
  final String step;
  final String message;
}

class ExtractIdResponse {
  const ExtractIdResponse({
    required this.registrationId,
    required this.step,
    required this.ocrData,
  });

  factory ExtractIdResponse.fromJson(Map<String, dynamic> json) {
    return ExtractIdResponse(
      registrationId: json['registrationId'] as String,
      step: json['step'] as String,
      ocrData: RegisterOcrSampleApi.fromApiJson(
        json['ocrData'] as Map<String, dynamic>,
      ),
    );
  }

  final String registrationId;
  final String step;
  final RegisterOcrSample ocrData;
}

extension RegisterOcrSampleApi on RegisterOcrSample {
  static RegisterOcrSample fromApiJson(Map<String, dynamic> json) {
    return RegisterOcrSample(
      firstname: json['firstname'] as String? ?? '',
      lastname: json['lastname'] as String? ?? '',
      middleName: json['middleName'] as String? ?? '',
      gender: json['gender'] as String? ?? '',
      age: (json['age'] as num?)?.toInt() ?? 0,
      currentAddress: json['currentAddress'] as String? ?? '',
      phoneNumber: json['phoneNumber'] as String? ?? '',
      idNumber: RegisterOcrRawParser.normalizeIdNumber(
        json['idNumber'] as String? ?? '',
      ),
      departmentName: json['departmentName'] as String? ?? '',
      majorName: json['majorName'] as String? ?? '',
      yearLevelName: json['yearLevelName'] as String? ?? '',
      graduationYear: (json['graduationYear'] as num?)?.toInt() ?? 0,
      graduationMonth: (json['graduationMonth'] as num?)?.toInt() ?? 0,
      graduationDay: (json['graduationDay'] as num?)?.toInt() ?? 0,
      volunteerType: json['volunteerType'] as String? ?? 'STUDENT',
      rawTextFront: json['rawTextFront'] as String? ?? '',
      rawTextBack: json['rawTextBack'] as String? ?? '',
    ).enrichFromRawText();
  }

  Map<String, dynamic> toRegisterPayload({
    required String registrationId,
    required String roleType,
    required String email,
    required String password,
  }) {
    final normalizedId = RegisterOcrRawParser.normalizeIdNumber(idNumber);
    final isBeneficiary = roleType == 'BENEFICIARY';

    return {
      'registrationId': registrationId,
      'firstname': firstname,
      'lastname': lastname,
      'middle_name': middleName,
      'role_type': roleType,
      'gender': _mapGender(gender),
      'age': age,
      'current_address': currentAddress,
      'phone_number': phoneNumber,
      'account': {'email': email, 'password': password},
      'school_info': isBeneficiary
          ? {
              'id_number': normalizedId,
              'graduation_year': 2000,
              'graduation_month': 1,
              'graduation_day': 1,
              'department': {'name': 'N/A'},
              'major': {'name': 'N/A'},
              'year_level': {'name': 'N/A'},
            }
          : {
              'id_number': normalizedId,
              'graduation_year': graduationYear,
              'graduation_month': graduationMonth,
              'graduation_day': graduationDay,
              'department': {'name': departmentName},
              'major': {'name': majorName.isEmpty ? departmentName : majorName},
              'year_level': {
                'name': yearLevelName.isEmpty ? 'N/A' : yearLevelName,
              },
            },
    };
  }

  static String _mapGender(String value) {
    final normalized = value.trim().toUpperCase();
    return switch (normalized) {
      'MALE' || 'M' => 'MALE',
      'FEMALE' || 'F' => 'FEMALE',
      _ => 'OTHER',
    };
  }
}
