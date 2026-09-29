import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/features/dashboard/data/help_center_data.dart';
import 'package:mobile/features/dashboard/data/models/support_ticket_models.dart';

/// The requester's side of `v1/support-tickets` — everything under `me/`.
class SupportTicketService {
  SupportTicketService({ApiClient? apiClient})
    : _api = apiClient ?? ApiClient();

  final ApiClient _api;

  static const _base = '/support-tickets/me';

  Future<List<SupportRequest>> fetchMine() async {
    final response = await _api.getJson(_base);
    final data = response['data'] as Map<String, dynamic>;
    return (data['items'] as List<dynamic>)
        .map((i) => SupportTicketResponse.fromJson(i as Map<String, dynamic>))
        .map((t) => t.toRequest())
        .toList(growable: false);
  }

  Future<SupportRequest> fetchOne(String id) async {
    return _ticket(await _api.getJson('$_base/$id'));
  }

  /// Priority is decided server-side from [type]; the app never sends it.
  Future<SupportRequest> create({
    required String subject,
    required String description,
    required SupportTicketType type,
  }) async {
    return _ticket(
      await _api.postJson(
        _base,
        body: {
          'subject': subject,
          'description': description,
          'type': supportTicketTypeToApi(type),
        },
      ),
    );
  }

  Future<SupportRequest> reply(String id, String body) async {
    return _ticket(
      await _api.postJson('$_base/$id/replies', body: {'body': body}),
    );
  }

  /// [body] is what is still wrong; required by the server when [fixed] is false.
  Future<SupportRequest> confirmFix(
    String id, {
    required bool fixed,
    String? body,
  }) async {
    return _ticket(
      await _api.postJson(
        '$_base/$id/confirm-fix',
        body: {'fixed': fixed, 'body': ?body},
      ),
    );
  }

  Future<SupportRequest> reopen(String id, String body) async {
    return _ticket(
      await _api.postJson('$_base/$id/reopen', body: {'body': body}),
    );
  }

  SupportRequest _ticket(Map<String, dynamic> response) {
    return SupportTicketResponse.fromJson(
      response['data'] as Map<String, dynamic>,
    ).toRequest();
  }
}
