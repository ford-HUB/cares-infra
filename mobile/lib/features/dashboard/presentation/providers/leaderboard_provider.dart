import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/features/dashboard/data/models/ranking_models.dart';
import 'package:mobile/features/dashboard/data/ranking_service.dart';

final rankingServiceProvider = Provider<RankingService>(
  (ref) => RankingService(),
);

/// Null follows the portal's default.
final leaderboardPeriodProvider = StateProvider<String?>((ref) => null);

/// The home header watches it too, so one fetch serves both.
final leaderboardProvider = FutureProvider.autoDispose<Leaderboard>((
  ref,
) async {
  final period = ref.watch(leaderboardPeriodProvider);
  return ref.read(rankingServiceProvider).fetchLeaderboard(period: period);
});
