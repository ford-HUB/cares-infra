import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/features/dashboard/data/models/ranking_models.dart';
import 'package:mobile/features/dashboard/data/ranking_service.dart';

final rankingServiceProvider = Provider<RankingService>(
  (ref) => RankingService(),
);

/// Which window the Ranks tab is showing. Null follows the portal's default.
final leaderboardPeriodProvider = StateProvider<String?>((ref) => null);

/// The scored board for the selected period. The home header watches this too
/// for the rank badge and avatar frame, so one fetch serves both.
final leaderboardProvider = FutureProvider.autoDispose<Leaderboard>((
  ref,
) async {
  final period = ref.watch(leaderboardPeriodProvider);
  return ref.read(rankingServiceProvider).fetchLeaderboard(period: period);
});
