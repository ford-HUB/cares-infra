import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/core/session/role_account_store.dart';
import 'package:mobile/features/dashboard/data/models/user_request_models.dart';
import 'package:mobile/features/dashboard/data/notification_sync.dart';

/// Role-access proof from the registration session is copied server-side so a
/// director can review it after the session expires.
class UserRequestService {
  UserRequestService({ApiClient? apiClient}) : _api = apiClient ?? ApiClient();

  final ApiClient _api;

  static const _base = '/user-requests/me';

  Future<List<UserRequestResponse>> fetchMine() async {
    final response = await _api.getJson(_base);
    final data = response['data'] as Map<String, dynamic>;
    return (data['items'] as List<dynamic>)
        .map((i) => UserRequestResponse.fromJson(i as Map<String, dynamic>))
        .toList(growable: false);
  }

  Future<UserRequestResponse> requestRoleAccess({
    required String registrationId,
    required String roleType,
  }) async {
    final response = await _api.postJson(
      '$_base/role-access',
      body: {'registrationId': registrationId, 'roleType': roleType},
    );
    // The server answers with a notice; pull it in without waiting a poll.
    NotificationSync.instance.refreshSoon();
    return UserRequestResponse.fromJson(
      response['data'] as Map<String, dynamic>,
    );
  }

  /// Doesn't book a slot: a director reviews the proof of residency first.
  /// Always sent as `?role=BENEFICIARY`, since the switcher is local.
  Future<UserRequestResponse> applyForEvent({
    required int eventId,
    required String proofPath,
    required String proofName,
    String? proofMimeType,
  }) async {
    final proof = await http.MultipartFile.fromPath(
      'proof',
      proofPath,
      filename: proofName,
      contentType: _mediaTypeForName(proofName, proofMimeType),
    );
    final response = await _api.postMultipart(
      '$_base/event-join?role=${RoleAccountStore.beneficiary}',
      fields: {'eventId': '$eventId'},
      files: [proof],
    );
    NotificationSync.instance.refreshSoon();
    return UserRequestResponse.fromJson(
      response['data'] as Map<String, dynamic>,
    );
  }

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
