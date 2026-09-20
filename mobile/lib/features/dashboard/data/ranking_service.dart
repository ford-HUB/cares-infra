import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/features/dashboard/data/models/ranking_models.dart';

/// `/rankings/leaderboard` — the volunteer board the portal scores: points per
/// event attended, an escalating penalty per registered event skipped, and the
/// tier ladder that decides which frame an avatar wears.
class RankingService {
  RankingService({ApiClient? apiClient}) : _api = apiClient ?? ApiClient();

  final ApiClient _api;

  /// [period] is one of `month`, `quarter`, `year`, `all`; null asks for the
  /// portal's saved default.
  Future<Leaderboard> fetchLeaderboard({String? period}) async {
    final query = period == null ? '' : '?period=$period';
    final response = await _api.getJson('/rankings/leaderboard$query');
    return Leaderboard.fromJson(response['data'] as Map<String, dynamic>);
  }
}
