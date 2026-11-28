import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'package:image_picker/image_picker.dart';
import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/core/utils/phone_number_format.dart';
import 'package:mobile/features/auth/data/models/registration_api_models.dart';
import 'package:mobile/features/auth/domain/register_ocr_sample.dart';

class AuthRegistrationService {
  AuthRegistrationService({ApiClient? apiClient})
    : _api = apiClient ?? ApiClient();

  final ApiClient _api;

  /// ID-less session (beneficiaries skip the ID upload).
  Future<StartSessionResponse> startSession({required String roleType}) async {
    final response = await _api.postJson(
      '/auth/start-session',
      body: {'roleType': roleType},
    );

    return StartSessionResponse.fromJson(
      response['data'] as Map<String, dynamic>,
    );
  }

  Future<UploadIdResponse> uploadId({
    required XFile front,
    required XFile back,
    String? roleType,
  }) async {
    final frontBytes = await front.readAsBytes();
    final backBytes = await back.readAsBytes();

    final fields = <String, String>{};
    if (roleType != null && roleType.isNotEmpty) {
      fields['roleType'] = roleType;
    }

    final response = await _api.postMultipart(
      '/auth/upload-id',
      fields: fields,
      files: [
        http.MultipartFile.fromBytes(
          'front',
          frontBytes,
          filename: front.name,
          contentType: _imageContentType(front),
        ),
        http.MultipartFile.fromBytes(
          'back',
          backBytes,
          filename: back.name,
          contentType: _imageContentType(back),
        ),
      ],
    );

    return UploadIdResponse.fromJson(response['data'] as Map<String, dynamic>);
  }

  /// Skips the student-ID check and OCR; [verifyFace] matches against it and a
  /// director reviews it.
  Future<UploadIdResponse> uploadAlumniId({
    required XFile front,
    required XFile back,
  }) => _uploadReviewedId('/auth/upload-alumni-id', front: front, back: back);

  /// Not photo-checked, face-matched or OCR'd; a director reviews it.
  Future<UploadIdResponse> uploadPartnerBarangayId({
    required XFile front,
    required XFile back,
  }) => _uploadReviewedId(
    '/auth/upload-partner-barangay-id',
    front: front,
    back: back,
  );

  /// For staff/alumni IDs the app couldn't recognize: skips the ID checks and
  /// face scan; a director reviews it via the Request module. [volunteerType]
  /// is `STAFF` or `ALUMNI`.
  Future<UploadIdResponse> uploadManualId({
    required XFile front,
    required XFile back,
    required String volunteerType,
  }) => _uploadReviewedId(
    '/auth/upload-manual-id',
    front: front,
    back: back,
    fields: {'volunteerType': volunteerType},
  );

  Future<UploadIdResponse> _uploadReviewedId(
    String path, {
    required XFile front,
    required XFile back,
    Map<String, String> fields = const {},
  }) async {
    final frontBytes = await front.readAsBytes();
    final backBytes = await back.readAsBytes();

    final response = await _api.postMultipart(
      path,
      fields: fields,
      files: [
        http.MultipartFile.fromBytes(
          'front',
          frontBytes,
          filename: front.name,
          contentType: _imageContentType(front),
        ),
        http.MultipartFile.fromBytes(
          'back',
          backBytes,
          filename: back.name,
          contentType: _imageContentType(back),
        ),
      ],
    );

    return UploadIdResponse.fromJson(response['data'] as Map<String, dynamic>);
  }

  /// Any file type; a second call replaces the first.
  Future<RegistrationDocumentResponse> uploadRegistrationDocument({
    required String registrationId,
    required String path,
    required String name,
  }) async {
    final response = await _api.postMultipart(
      '/auth/registration-document',
      fields: {'registrationId': registrationId},
      files: [
        await http.MultipartFile.fromPath(
          'document',
          path,
          filename: name,
          contentType: _documentContentType(name),
        ),
      ],
    );

    return RegistrationDocumentResponse.fromJson(
      response['data'] as Map<String, dynamic>,
    );
  }

  Future<VerifyFaceResponse> verifyFace({
    required String registrationId,
    required XFile selfie,
  }) async {
    final selfieBytes = await selfie.readAsBytes();

    final response = await _api.postMultipart(
      '/auth/verify-face',
      fields: {'registrationId': registrationId},
      files: [
        http.MultipartFile.fromBytes(
          'selfie',
          selfieBytes,
          filename: selfie.name,
          contentType: _imageContentType(selfie),
        ),
      ],
    );

    return VerifyFaceResponse.fromJson(
      response['data'] as Map<String, dynamic>,
    );
  }

  /// [staffId] asks the OCR service to read the card as a staff/faculty ID.
  Future<ExtractIdResponse> extractId({
    required String registrationId,
    bool staffId = false,
  }) async {
    final response = await _api.postJson(
      '/auth/extract-id',
      body: {
        'registrationId': registrationId,
        if (staffId) 'volunteerType': 'STAFF',
      },
      timeout: const Duration(seconds: 90),
    );

    return ExtractIdResponse.fromJson(response['data'] as Map<String, dynamic>);
  }

  Future<Map<String, dynamic>> registerFromSession({
    required String registrationId,
    required RegisterOcrSample ocrData,
    required String roleType,
    required String email,
    required String password,
    bool studentBeneficiary = false,
  }) async {
    final response = await _api.postJson(
      '/auth/register-from-session',
      body: ocrData.toRegisterPayload(
        registrationId: registrationId,
        roleType: roleType,
        email: email,
        password: password,
        studentBeneficiary: studentBeneficiary,
      ),
    );

    return response['data'] as Map<String, dynamic>? ?? {};
  }

  /// [phoneNumber] / [idNumber] clashes surface as a [RegistrationConflict]
  /// before the OTP. [purpose] is login when verifying an unfinished account
  /// from sign-in; [resend] forces a new code.
  Future<SendVerificationResponse> sendVerificationCode({
    required String email,
    String? phoneNumber,
    String? idNumber,
    VerificationPurpose purpose = VerificationPurpose.registration,
    bool resend = false,
  }) async {
    final phone = phoneNumber == null
        ? null
        : normalizePhilippinePhone(phoneNumber);
    final id = idNumber?.trim();
    final response = await _api.postJson(
      '/auth/send-verification',
      body: {
        'email': email.trim(),
        if (phone != null && phone.isNotEmpty) 'phone_number': phone,
        if (id != null && id.isNotEmpty) 'id_number': id,
        'purpose': purpose.name,
        if (resend) 'resend': true,
      },
    );

    return SendVerificationResponse.fromJson(
      response['data'] as Map<String, dynamic>,
    );
  }

  Future<VerificationStatusResponse> getVerificationStatus({
    required String email,
  }) async {
    final response = await _api.postJson(
      '/auth/verification-status',
      body: {'email': email.trim()},
    );

    return VerificationStatusResponse.fromJson(
      response['data'] as Map<String, dynamic>,
    );
  }

  Future<void> verifyOtp({required String email, required String otp}) async {
    await _api.postJson(
      '/auth/verify-otp',
      body: {'email': email.trim(), 'otp': otp.trim()},
    );
  }

  /// Known types get their real MIME type so the portal can preview them.
  MediaType _documentContentType(String name) {
    final ext = name.contains('.') ? name.split('.').last.toLowerCase() : '';
    return switch (ext) {
      'pdf' => MediaType('application', 'pdf'),
      'png' => MediaType('image', 'png'),
      'jpg' || 'jpeg' => MediaType('image', 'jpeg'),
      'webp' => MediaType('image', 'webp'),
      'heic' => MediaType('image', 'heic'),
      'doc' => MediaType('application', 'msword'),
      'docx' => MediaType(
        'application',
        'vnd.openxmlformats-officedocument.wordprocessingml.document',
      ),
      'xls' => MediaType('application', 'vnd.ms-excel'),
      'xlsx' => MediaType(
        'application',
        'vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ),
      'txt' => MediaType('text', 'plain'),
      _ => MediaType('application', 'octet-stream'),
    };
  }

  MediaType _imageContentType(XFile file) {
    final mime = file.mimeType;
    if (mime != null && mime.startsWith('image/')) {
      return MediaType.parse(mime);
    }

    final name = file.name.toLowerCase();
    if (name.endsWith('.png')) {
      return MediaType('image', 'png');
    }
    if (name.endsWith('.webp')) {
      return MediaType('image', 'webp');
    }

    return MediaType('image', 'jpeg');
  }
}

enum VerificationPurpose { registration, login }
