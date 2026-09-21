import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/features/dashboard/data/models/notification_models.dart';

/// `/notifications/mobile` — the person's own feed: attendance rulings, event
/// start reminders, certificates and announcements the server wrote for them.
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

  Future<NotificationFeed> markAllRead() async {
    final response = await _api.patchJson(
      '/notifications/mobile/read-all',
      body: const {},
    );
    return NotificationFeed.fromJson(response['data'] as Map<String, dynamic>);
  }
}
