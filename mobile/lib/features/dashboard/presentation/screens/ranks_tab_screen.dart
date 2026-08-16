import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/dashboard/domain/mock_ranks.dart';

class RanksTabScreen extends StatelessWidget {
  const RanksTabScreen({
    super.key,
    this.displayName = 'You',
    this.points = MockRanks.currentUserPoints,
  });

  final String displayName;
  final int points;

  @override
  Widget build(BuildContext context) {
    final tier = MockRanks.tierForPoints(points);
    final nextTier = _nextTier(tier);
    final progress = _tierProgress(points, tier);

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
                    'Leaderboard and volunteer tiers',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                      color: AppColors.secondary.withValues(alpha: 0.95),
                    ),
                  ),
                  const SizedBox(height: 16),
                  _YourRankCard(
                    rank: MockRanks.currentUserRank,
                    displayName: displayName,
                    points: points,
                    tierName: tier.name,
                    progress: progress,
                    nextTierName: nextTier?.name,
                    pointsToNext: nextTier != null
                        ? nextTier.minPoints - points
                        : null,
                  ),
                ],
              ),
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 8),
            sliver: SliverToBoxAdapter(
              child: Text(
                'Top Volunteers',
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w800,
                  color: AppColors.primaryDark.withValues(alpha: 0.95),
                ),
              ),
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
            sliver: SliverList.separated(
              itemCount: MockRanks.leaderboard.length,
              separatorBuilder: (context, index) => const SizedBox(height: 8),
              itemBuilder: (context, index) {
                return _LeaderboardRow(entry: MockRanks.leaderboard[index]);
              },
            ),
          ),
        ],
      ),
    );
  }

  MockRankTier? _nextTier(MockRankTier current) {
    final index = MockRanks.tiers.indexOf(current);
    if (index < 0 || index >= MockRanks.tiers.length - 1) return null;
    return MockRanks.tiers[index + 1];
  }

  double _tierProgress(int points, MockRankTier tier) {
    final span = tier.maxPoints - tier.minPoints;
    if (span <= 0) return 1;
    return ((points - tier.minPoints) / span).clamp(0.0, 1.0);
  }
}

class _YourRankCard extends StatelessWidget {
  const _YourRankCard({
    required this.rank,
    required this.displayName,
    required this.points,
    required this.tierName,
    required this.progress,
    this.nextTierName,
    this.pointsToNext,
  });

  final int rank;
  final String displayName;
  final int points;
  final String tierName;
  final double progress;
  final String? nextTierName;
  final int? pointsToNext;

  @override
  Widget build(BuildContext context) {
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
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.15),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.emoji_events_outlined,
                  color: AppColors.accent,
                  size: 28,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      displayName,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    Text(
                      '#$rank · $tierName Tier',
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
                '$points pts',
                style: const TextStyle(
                  color: AppColors.accent,
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          ClipRRect(
            borderRadius: BorderRadius.circular(6),
            child: LinearProgressIndicator(
              value: progress,
              minHeight: 8,
              backgroundColor: Colors.white.withValues(alpha: 0.2),
              color: AppColors.accent,
            ),
          ),
          if (nextTierName != null && pointsToNext != null) ...[
            const SizedBox(height: 8),
            Text(
              '$pointsToNext pts to $nextTierName',
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

class _LeaderboardRow extends StatelessWidget {
  const _LeaderboardRow({required this.entry});

  final MockLeaderboardEntry entry;

  Color? _medalColor(int rank) => switch (rank) {
    1 => const Color(0xFFFFD700),
    2 => const Color(0xFFC0C0C0),
    3 => const Color(0xFFCD7F32),
    _ => null,
  };

  @override
  Widget build(BuildContext context) {
    final medalColor = _medalColor(entry.rank);
    final isUser = entry.isCurrentUser;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: isUser ? AppColors.light.withValues(alpha: 0.45) : Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isUser ? AppColors.primary : AppColors.fieldBorder,
          width: isUser ? 1.5 : 1,
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
          CircleAvatar(
            radius: 18,
            backgroundColor: isUser
                ? AppColors.primaryDark
                : AppColors.secondary,
            child: Text(
              entry.displayName.isNotEmpty
                  ? entry.displayName[0].toUpperCase()
                  : '?',
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w700,
                fontSize: 14,
              ),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  entry.displayName,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: AppColors.primaryDark,
                  ),
                ),
                Text(
                  '${entry.hours} hrs',
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
