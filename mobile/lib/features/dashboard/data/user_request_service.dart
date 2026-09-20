import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/features/dashboard/data/models/user_request_models.dart';

/// The requester's side of `v1/user-requests` — everything under `me/`.
///
/// A role-access request is filed after the ID + face check ran inside a
/// registration session; the server copies that session's proof onto the
/// request so a director can review it after the session expires.
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
    return UserRequestResponse.fromJson(
      response['data'] as Map<String, dynamic>,
    );
  }

  /// Beneficiaries do not take a slot on the spot — the director accepts the
  /// request first, and that acceptance is what books the place.
  Future<UserRequestResponse> requestEventJoin({required int eventId}) async {
    final response = await _api.postJson(
      '$_base/event-join',
      body: {'eventId': eventId},
    );
    return UserRequestResponse.fromJson(
      response['data'] as Map<String, dynamic>,
    );
  }
}
