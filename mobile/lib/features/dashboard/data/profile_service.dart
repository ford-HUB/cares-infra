import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'package:image_picker/image_picker.dart';
import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/core/services/auth_session.dart';
import 'package:mobile/core/session/role_account_store.dart';
import 'package:mobile/features/dashboard/data/mobile_profile_models.dart';

/// Mirrors the profile into [RoleAccountStore].
class ProfileService {
  ProfileService({ApiClient? apiClient}) : _api = apiClient ?? ApiClient();

  final ApiClient _api;

  static const profilePath = '/profile/me/mobile';

  static const avatarPath = '/profile/me/mobile/avatar';

  static const schoolRecordPath = '/profile/me/mobile/school-record';

  static const residencyPath = '/profile/me/mobile/residency';

  /// The switcher is local, so this tells the server which side to measure
  /// `profile_completion` against; omitted, it uses the registered role.
  Future<MobileProfile> fetchMyProfile({String? roleType}) async {
    final response = await _api.getJson(_scoped(profilePath, roleType));
    final data = response['data'] as Map<String, dynamic>? ?? {};
    return MobileProfile.fromJson(data);
  }

  /// No-op without a session token. Throws [ApiException] so callers choose how
  /// to surface it.
  Future<MobileProfile?> syncRoleAccount({String? roleType}) async {
    if (!AuthSession.isSignedIn) return null;

    final profile = await fetchMyProfile(roleType: roleType);
    _apply(profile);
    return profile;
  }

  /// Full replace; the re-read profile in the response is written to the role
  /// account.
  Future<MobileProfile> updateMyProfile(
    MobileProfileUpdate update, {
    XFile? avatar,
    String? roleType,
  }) async {
    final files = <http.MultipartFile>[];
    if (avatar != null) {
      files.add(
        await http.MultipartFile.fromPath(
          'avatar',
          avatar.path,
          filename: avatar.name,
          contentType: _mediaTypeFor(avatar),
        ),
      );
    }

    final response = await _api.putMultipart(
      _scoped(profilePath, roleType),
      fields: update.toFields(),
      files: files,
    );
    final data = response['data'] as Map<String, dynamic>? ?? {};
    final profile = MobileProfile.fromJson(data);
    _apply(profile);
    return profile;
  }

  /// Rewrites the school record from the OCR of [registrationId]'s ID/face
  /// steps; nothing is typed on the device.
  Future<MobileProfile> applySchoolRecord({
    required String registrationId,
  }) async {
    final response = await _api.postJson(
      schoolRecordPath,
      body: {'registrationId': registrationId},
    );
    final data = response['data'] as Map<String, dynamic>? ?? {};
    final profile = MobileProfile.fromJson(data);
    _apply(profile);
    return profile;
  }

  /// The server OCRs the proof, moves the address to what it read and keeps the
  /// file; a 400 carries why it was unreadable.
  Future<MobileProfile> uploadResidencyDocument({
    required String path,
    required String fileName,
    String? mimeType,
    String? roleType,
  }) async {
    final file = await http.MultipartFile.fromPath(
      'document',
      path,
      filename: fileName,
      contentType: _mediaTypeForName(fileName, mimeType),
    );

    final response = await _api.postMultipart(
      _scoped(residencyPath, roleType),
      fields: const {},
      files: [file],
    );
    final data = response['data'] as Map<String, dynamic>? ?? {};
    final profile = MobileProfile.fromJson(data);
    _apply(profile);
    return profile;
  }

  /// For `Image.network` with [avatarHeaders]; the stream is owner-private.
  String residencyDocumentUrl(String documentId) =>
      _api.uri('$residencyPath/$documentId').toString();

  /// `?role=` so the server scopes completion to the side being shown.
  String _scoped(String path, String? roleType) {
    if (roleType == null || roleType.trim().isEmpty) return path;
    return '$path?role=${RoleAccountStore.normalize(roleType)}';
  }

  void _apply(MobileProfile profile) {
    RoleAccountStore.instance.applyServerProfile(
      profile,
      avatarUrl: avatarUrlFor(profile),
    );
  }

  /// Null without a photo. Names the profiling role (photos are per role); the
  /// `v` query busts the image cache after an upload.
  String? avatarUrlFor(MobileProfile profile) {
    if (!profile.hasProfileImage) return null;
    final base = _api.uri(avatarPath);
    return base
        .replace(
          queryParameters: {
            'role': RoleAccountStore.normalize(profile.profilingRole),
            'v': '${DateTime.now().millisecondsSinceEpoch}',
          },
        )
        .toString();
  }

  /// The stream is private, so the image widget has to carry the token.
  Map<String, String> get avatarHeaders => _api.authHeaders();

  MediaType? _mediaTypeFor(XFile file) =>
      _mediaTypeForName(file.name, file.mimeType);

  MediaType? _mediaTypeForName(String name, String? mime) {
    if (mime != null && mime.contains('/')) {
      final parts = mime.split('/');
      return MediaType(parts[0], parts[1]);
    }
    final ext = name.split('.').last.toLowerCase();
    return switch (ext) {
      'png' => MediaType('image', 'png'),
      'webp' => MediaType('image', 'webp'),
      'jpg' || 'jpeg' => MediaType('image', 'jpeg'),
      'pdf' => MediaType('application', 'pdf'),
      _ => null,
    };
  }
}
