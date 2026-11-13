import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/dashboard/data/models/ranking_models.dart';
import 'package:mobile/features/dashboard/presentation/providers/leaderboard_provider.dart';
import 'package:mobile/features/dashboard/presentation/widgets/ranks_tab_widgets.dart';
import 'package:mobile/features/dashboard/widgets/activity_tab_widgets.dart';

/// The volunteer leaderboard. Scored on the server from ruled attendance —
/// points per event attended, an escalating penalty per registered event
/// skipped — and cut into the tier ladder the portal customises. The same
/// fetch feeds the home header's rank badge.
class RanksTabScreen extends ConsumerWidget {
  const RanksTabScreen({super.key, this.displayName = 'You'});

  final String displayName;

  static const _periods = [
    (value: 'month', label: 'This Month'),
    (value: 'quarter', label: 'Quarter'),
    (value: 'year', label: 'Year'),
    (value: 'all', label: 'All Time'),
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final board = ref.watch(leaderboardProvider);
    final selected = ref.watch(leaderboardPeriodProvider);
    final period = selected ?? board.asData?.value.period ?? 'month';

    return ColoredBox(
      color: AppColors.background,
      child: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: DeepTabHeader(
              title: 'Ranks',
              bottom: RankPeriodChips(
                periods: _periods,
                selected: period,
                onSelected: (value) =>
                    ref.read(leaderboardPeriodProvider.notifier).state = value,
              ),
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 8),
            sliver: SliverToBoxAdapter(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  board.when(
                    loading: () => const YourRankSkeleton(),
                    error: (error, _) => RanksError(
                      message: error.toString(),
                      onRetry: () => ref.invalidate(leaderboardProvider),
                    ),
                    data: (data) =>
                        YourRankCard(board: data, displayName: displayName),
                  ),
                ],
              ),
            ),
          ),
          ...switch (board) {
            AsyncData(:final value) => _leaderboard(value),
            _ => const [],
          },
        ],
      ),
    );
  }

  List<Widget> _leaderboard(Leaderboard board) {
    return [
      SliverPadding(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 8),
        sliver: SliverToBoxAdapter(
          child: Row(
            children: [
              Expanded(
                child: Text(
                  'Top Volunteers',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                    color: AppColors.primaryDark.withValues(alpha: 0.95),
                  ),
                ),
              ),
              Text(
                '${board.totalRanked} ranked',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textSecondary,
                ),
              ),
            ],
          ),
        ),
      ),
      if (board.entries.isEmpty)
        const SliverPadding(
          padding: EdgeInsets.fromLTRB(20, 4, 20, 24),
          sliver: SliverToBoxAdapter(child: RanksEmpty()),
        )
      else
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
          sliver: SliverList.separated(
            itemCount: board.entries.length,
            separatorBuilder: (context, index) => const SizedBox(height: 8),
            itemBuilder: (context, index) {
              final entry = board.entries[index];
              return LeaderboardRow(
                entry: entry,
                tier: board.tierById(entry.tierId),
              );
            },
          ),
        ),
    ];
  }
}
