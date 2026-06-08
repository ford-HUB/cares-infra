import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/features/auth/data/models/registration_api_models.dart';
import 'package:mobile/features/auth/domain/register_ocr_sample.dart';

class AuthRegistrationService {
  AuthRegistrationService({ApiClient? apiClient}) : _api = apiClient ?? ApiClient();

  final ApiClient _api;

  Future<UploadIdResponse> uploadId({
    required XFile front,
    required XFile back,
  }) async {
    final frontBytes = await front.readAsBytes();
    final backBytes = await back.readAsBytes();

    final response = await _api.postMultipart(
      '/auth/upload-id',
      fields: const {},
      files: [
        http.MultipartFile.fromBytes(
          'front',
          frontBytes,
          filename: front.name,
        ),
        http.MultipartFile.fromBytes(
          'back',
          backBytes,
          filename: back.name,
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
        ),
      ],
    );

    return VerifyFaceResponse.fromJson(response['data'] as Map<String, dynamic>);
  }

  Future<ExtractIdResponse> extractId({required String registrationId}) async {
    final response = await _api.postJson(
      '/auth/extract-id',
      body: {'registrationId': registrationId},
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
}
