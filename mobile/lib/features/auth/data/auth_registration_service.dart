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

  /// Starts an ID-less registration session (beneficiaries skip the ID upload).
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

  Future<ExtractIdResponse> extractId({required String registrationId}) async {
    final response = await _api.postJson(
      '/auth/extract-id',
      body: {'registrationId': registrationId},
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
  }) async {
    final response = await _api.postJson(
      '/auth/register-from-session',
      body: ocrData.toRegisterPayload(
        registrationId: registrationId,
        roleType: roleType,
        email: email,
        password: password,
      ),
    );

    return response['data'] as Map<String, dynamic>? ?? {};
  }

  /// [phoneNumber] and [idNumber] are checked for clashes with existing
  /// accounts before a code is sent, so a taken value is reported as a
  /// [RegistrationConflict] on the form rather than after the OTP.
  Future<SendVerificationResponse> sendVerificationCode({
    required String email,
    String? phoneNumber,
    String? idNumber,
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
