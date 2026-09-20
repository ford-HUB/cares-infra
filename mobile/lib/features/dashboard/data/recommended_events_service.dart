import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/features/dashboard/data/models/recommended_event_models.dart';

/// Open events the server matched to the caller's interests by reading each
/// event's title and description through nlp-service.
class RecommendedEventsService {
  RecommendedEventsService({ApiClient? apiClient})
    : _api = apiClient ?? ApiClient();

  final ApiClient _api;

  static const defaultLimit = 10;

  /// Mirrors the server's RECOMMENDED_EVENTS_MAX_LIMIT.
  static const maxLimit = 50;

  Future<RecommendedEventsPage> fetch({int limit = defaultLimit}) async {
    final response = await _api.getJson(
      Uri(
        path: '/events/recommended',
        queryParameters: {'limit': '$limit'},
      ).toString(),
    );
    return RecommendedEventsPage.fromJson(
      response['data'] as Map<String, dynamic>,
    );
  }

  /// Every event the caller holds a slot on — upcoming, ongoing and finished.
  /// Same row shape as the feed, minus interest matching.
  Future<List<RecommendedEvent>> fetchRegistered() async {
    final response = await _api.getJson('/events/registered');
    final data = response['data'] as Map<String, dynamic>;
    return (data['events'] as List<dynamic>? ?? [])
        .map((e) => RecommendedEvent.fromJson(e as Map<String, dynamic>))
        .toList();
  }
}
