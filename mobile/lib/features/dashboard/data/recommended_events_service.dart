import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/features/dashboard/data/models/recommended_event_models.dart';

/// Matched server-side by running event titles and descriptions through
/// nlp-service.
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

  /// Flagged for beneficiaries by an operator; no interest matching.
  Future<List<RecommendedEvent>> fetchForBeneficiaries() async {
    final response = await _api.getJson('/events/beneficiary');
    final data = response['data'] as Map<String, dynamic>;
    return (data['events'] as List<dynamic>? ?? [])
        .map((e) => RecommendedEvent.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// Finished events that were open to beneficiaries, latest first.
  Future<List<RecommendedEvent>> fetchCompletedForBeneficiaries() async {
    final response = await _api.getJson('/events/beneficiary/completed');
    final data = response['data'] as Map<String, dynamic>;
    return (data['events'] as List<dynamic>? ?? [])
        .map((e) => RecommendedEvent.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// Upcoming, ongoing and finished; no interest matching.
  Future<List<RecommendedEvent>> fetchRegistered() async {
    final response = await _api.getJson('/events/registered');
    final data = response['data'] as Map<String, dynamic>;
    return (data['events'] as List<dynamic>? ?? [])
        .map((e) => RecommendedEvent.fromJson(e as Map<String, dynamic>))
        .toList();
  }
}
