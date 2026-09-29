import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'package:image_picker/image_picker.dart';
import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/core/services/auth_session.dart';
import 'package:mobile/core/session/role_account_store.dart';
import 'package:mobile/features/dashboard/data/mobile_profile_models.dart';

/// Reads the signed-in person's profile from the server and mirrors it into
/// [RoleAccountStore] so the Profile tab shows the role's real data.
class ProfileService {
  ProfileService({ApiClient? apiClient}) : _api = apiClient ?? ApiClient();

  final ApiClient _api;

  static const profilePath = '/profile/me/mobile';

  static const avatarPath = '/profile/me/mobile/avatar';

  static const schoolRecordPath = '/profile/me/mobile/school-record';

  static const residencyPath = '/profile/me/mobile/residency';

  /// [roleType] is the dashboard being shown (`VOLUNTEER`, `DONOR`,
  /// `BENEFICIARY`). The switcher is local, so the server is told which side
  /// to measure `profile_completion` against; omitted, it uses the
  /// registered role.
  Future<MobileProfile> fetchMyProfile({String? roleType}) async {
    final response = await _api.getJson(_scoped(profilePath, roleType));
    final data = response['data'] as Map<String, dynamic>? ?? {};
    return MobileProfile.fromJson(data);
  }

  /// Fetches the profile scoped to [roleType] and writes it onto that role
  /// account. Does nothing without a session token (e.g. the static
  /// prototype paths). Throws [ApiException] on failure so callers can decide
  /// how to surface it.
  Future<MobileProfile?> syncRoleAccount({String? roleType}) async {
    if (!AuthSession.isSignedIn) return null;

    final profile = await fetchMyProfile(roleType: roleType);
    _apply(profile);
    return profile;
  }

  /// `PUT /profile/me/mobile` — a full replace of the editable fields, with
  /// the new photo attached when the person picked one. The server answers
  /// with the re-read profile, which is written onto the role account so the
  /// Profile tab reflects the change without another fetch.
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

  /// `POST /profile/me/mobile/school-record` — after the ID upload, face
  /// match and OCR steps have run on [registrationId], asks the server to
  /// rewrite the school record (department, program, year level, student ID)
  /// from what OCR read. Nothing is typed in on the device.
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

  /// `POST /profile/me/mobile/residency` — uploads a barangay certificate or
  /// similar proof of residency (photo or PDF). The server runs it through
  /// OCR, moves the address to what it read, keeps the file on record and
  /// answers with the re-read profile. A 400 carries the reason the document
  /// could not be read.
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

  /// Absolute URL of a stored residency file, for `Image.network` with
  /// [avatarHeaders] (the stream is private to its owner).
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

  /// Absolute URL of the avatar stream, for `Image.network` with
  /// [avatarHeaders]. Null when the role has no photo on file. Each role
  /// keeps its own picture on the server, so the URL names the profiling
  /// role; the `v` query changes per read so a fresh upload is not served
  /// from the image cache under the old key.
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
