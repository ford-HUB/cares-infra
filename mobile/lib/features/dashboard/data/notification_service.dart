import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/features/dashboard/data/models/notification_models.dart';

/// `/notifications/mobile` — the person's own feed across every side of the
/// account: event news, attendance rulings, certificates, donation and
/// payment updates, request decisions, support replies and announcements.
/// Each row carries the side it belongs to; [NotificationSync] scopes it.
class NotificationService {
  NotificationService({ApiClient? apiClient}) : _api = apiClient ?? ApiClient();

  final ApiClient _api;

  Future<NotificationFeed> fetchFeed() async {
    final response = await _api.getJson('/notifications/mobile');
    return NotificationFeed.fromJson(response['data'] as Map<String, dynamic>);
  }

  Future<NotificationFeed> markRead(String id) async {
    final response = await _api.patchJson(
      '/notifications/mobile/$id/read',
      body: const {},
    );
    return NotificationFeed.fromJson(response['data'] as Map<String, dynamic>);
  }

  /// Marks one side's rows (plus the account-wide ones) read; the other
  /// sides' unread rows are left for when the person switches to them.
  Future<NotificationFeed> markAllRead({required String roleType}) async {
    final response = await _api.patchJson(
      '/notifications/mobile/read-all?role=$roleType',
      body: const {},
    );
    return NotificationFeed.fromJson(response['data'] as Map<String, dynamic>);
  }
}
