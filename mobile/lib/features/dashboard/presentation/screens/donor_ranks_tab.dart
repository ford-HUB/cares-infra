import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/dashboard/data/donation_format.dart';
import 'package:mobile/features/dashboard/data/models/ranking_models.dart';
import 'package:mobile/features/dashboard/presentation/providers/donor_providers.dart';
import 'package:mobile/features/dashboard/presentation/widgets/rank_tier_frame.dart';
import 'package:mobile/features/dashboard/presentation/widgets/ranks_tab_widgets.dart';

/// The donor leaderboard. Scored on the server from confirmed donations —
/// one point per the portal's pesos-per-point rate, goods credited at the
/// value set per type — and cut into the same tier ladder the volunteers
/// wear. The same fetch feeds the home hero's rank badge.
class DonorRanksTab extends ConsumerWidget {
  const DonorRanksTab({super.key, this.displayName = 'You'});

  final String displayName;

  static const _periods = [
    (value: 'month', label: 'This Month'),
    (value: 'quarter', label: 'Quarter'),
    (value: 'year', label: 'Year'),
    (value: 'all', label: 'All Time'),
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final board = ref.watch(donorLeaderboardProvider);
    final selected = ref.watch(donorLeaderboardPeriodProvider);
    final period = selected ?? board.asData?.value.period ?? 'month';

    return SafeArea(
      bottom: false,
      child: CustomScrollView(
        slivers: [
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
            sliver: SliverToBoxAdapter(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Ranks',
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                      color: AppColors.primaryDark,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Leaderboard and donor tiers',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                      color: AppColors.secondary.withValues(alpha: 0.95),
                    ),
                  ),
                  const SizedBox(height: 12),
                  RankPeriodChips(
                    periods: _periods,
                    selected: period,
                    onSelected: (value) =>
                        ref
                                .read(donorLeaderboardPeriodProvider.notifier)
                                .state =
                            value,
                  ),
                  const SizedBox(height: 14),
                  board.when(
                    loading: () => const YourRankSkeleton(),
                    error: (error, _) => RanksError(
                      message: error.toString(),
                      onRetry: () => ref.invalidate(donorLeaderboardProvider),
                    ),
                    data: (data) => _YourDonorRankCard(
                      board: data,
                      displayName: displayName,
                    ),
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

  List<Widget> _leaderboard(DonorLeaderboard board) {
    return [
      SliverPadding(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 8),
        sliver: SliverToBoxAdapter(
          child: Row(
            children: [
              Expanded(
                child: Text(
                  'Top Donors',
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
                  color: AppColors.secondary.withValues(alpha: 0.9),
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
              return _DonorLeaderboardRow(
                entry: entry,
                tier: board.tierById(entry.tierId),
              );
            },
          ),
        ),
    ];
  }
}

class _YourDonorRankCard extends StatelessWidget {
  const _YourDonorRankCard({required this.board, required this.displayName});

  final DonorLeaderboard board;
  final String displayName;

  @override
  Widget build(BuildContext context) {
    final me = board.me;
    final tier = board.tierForRank(me.rank);
    final next = board.nextTierFor(me.rank);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.primaryDark,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              RankTierFrame(
                tier: tier,
                size: 48,
                child: CircleAvatar(
                  radius: 24,
                  backgroundColor: Colors.white.withValues(alpha: 0.15),
                  child: const Icon(
                    Icons.emoji_events_outlined,
                    color: AppColors.accent,
                    size: 26,
                  ),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      displayName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    Text(
                      me.rank == null
                          ? 'Unranked · a confirmed donation enters you'
                          : '#${me.rank} of ${board.totalRanked} · ${tier?.label ?? ''} Tier',
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.85),
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
              Text(
                '${me.points} pts',
                style: const TextStyle(
                  color: AppColors.accent,
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              _Stat(
                label: 'Confirmed',
                value: DonationFormat.peso(me.amount),
                detail:
                    '${me.donations} ${me.donations == 1 ? 'gift' : 'gifts'}',
              ),
              _Stat(
                label: 'Money',
                value: DonationFormat.peso(me.moneyAmount),
                detail: 'goods ${DonationFormat.peso(me.goodsAmount)}',
              ),
              _Stat(
                label: 'Per point',
                value: '₱${board.pesosPerPoint}',
                detail: 'confirmed only',
              ),
            ],
          ),
          if (next != null && next.placesToClimb > 0) ...[
            const SizedBox(height: 10),
            Text(
              '${next.placesToClimb} ${next.placesToClimb == 1 ? 'place' : 'places'} to ${next.tier.label}',
              style: TextStyle(
                color: Colors.white.withValues(alpha: 0.8),
                fontSize: 12,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.label, required this.value, required this.detail});

  final String label;
  final String value;
  final String detail;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.7),
              fontSize: 11,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            value,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 15,
              fontWeight: FontWeight.w800,
            ),
          ),
          Text(
            detail,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: Colors.white70,
              fontSize: 10.5,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

class _DonorLeaderboardRow extends StatelessWidget {
  const _DonorLeaderboardRow({required this.entry, required this.tier});

  final DonorLeaderboardEntry entry;
  final RankTier? tier;

  static Color? _medalColor(int rank) => switch (rank) {
    1 => const Color(0xFFFFD700),
    2 => const Color(0xFFC0C0C0),
    3 => const Color(0xFFCD7F32),
    _ => null,
  };

  @override
  Widget build(BuildContext context) {
    final medalColor = _medalColor(entry.rank);
    final isMe = entry.isMe;
    final initial = entry.displayName.trim().isNotEmpty
        ? entry.displayName.trim()[0].toUpperCase()
        : '?';

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: isMe ? AppColors.light.withValues(alpha: 0.45) : Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isMe ? AppColors.primary : AppColors.fieldBorder,
          width: isMe ? 1.5 : 1,
        ),
      ),
      child: Row(
        children: [
          SizedBox(
            width: 32,
            child: medalColor != null
                ? Icon(Icons.emoji_events, color: medalColor, size: 22)
                : Text(
                    '#${entry.rank}',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: AppColors.secondary.withValues(alpha: 0.9),
                    ),
                  ),
          ),
          RankTierFrame(
            tier: tier,
            size: 36,
            compact: true,
            child: CircleAvatar(
              radius: 18,
              backgroundColor: isMe
                  ? AppColors.primaryDark
                  : AppColors.secondary,
              child: Text(
                initial,
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w700,
                  fontSize: 14,
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  isMe ? '${entry.displayName} (you)' : entry.displayName,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: AppColors.primaryDark,
                  ),
                ),
                Text(
                  [
                    if (tier != null) tier!.label,
                    '${entry.donations} ${entry.donations == 1 ? 'donation' : 'donations'}',
                    DonationFormat.peso(entry.amount),
                  ].join(' · '),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                    color: AppColors.secondary.withValues(alpha: 0.9),
                  ),
                ),
              ],
            ),
          ),
          Text(
            '${entry.points}',
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w800,
              color: AppColors.primaryDark,
            ),
          ),
          const SizedBox(width: 2),
          const Text(
            'pts',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: AppColors.secondary,
            ),
          ),
        ],
      ),
    );
  }
}
