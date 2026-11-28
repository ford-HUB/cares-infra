import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/features/dashboard/data/models/ranking_models.dart';

/// Points per attended event, an escalating penalty per skipped registration,
/// and the tier ladder for avatar frames.
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

  /// Confirmed giving at the portal's pesos-per-point rate, same tier ladder.
  Future<DonorLeaderboard> fetchDonorLeaderboard({String? period}) async {
    final query = period == null ? '' : '?period=$period';
    final response = await _api.getJson('/rankings/donors/leaderboard$query');
    return DonorLeaderboard.fromJson(response['data'] as Map<String, dynamic>);
  }
}
