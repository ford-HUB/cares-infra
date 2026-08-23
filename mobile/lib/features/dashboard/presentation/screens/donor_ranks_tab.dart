import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/dashboard/data/donation_store.dart';
import 'package:mobile/features/dashboard/data/mock_donor_ranks.dart';

/// Donor leaderboard and giving tiers — mirrors [RanksTabScreen] layout.
class DonorRanksTab extends StatelessWidget {
  const DonorRanksTab({
    super.key,
    required this.displayName,
    required this.email,
  });

  final String displayName;
  final String email;

  @override
  Widget build(BuildContext context) {
    final amountDonated = DonationStore.instance.totalDonatedDisplayForEmail(
      email,
    );
    final tier = MockDonorRanks.tierForAmount(amountDonated);
    final nextTier = _nextTier(tier);
    final progress = _tierProgress(amountDonated, tier);

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
                    'Leaderboard and donor giving tiers',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                      color: AppColors.secondary.withValues(alpha: 0.95),
                    ),
                  ),
                  const SizedBox(height: 16),
                  _YourRankCard(
                    displayName: displayName,
                    amountDonated: amountDonated,
                    tierName: tier.name,
                    progress: progress,
                    nextTierName: nextTier?.name,
                    amountToNext: nextTier != null
                        ? nextTier.minAmount - amountDonated
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
                'Top Donors',
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
              itemCount: MockDonorRanks.leaderboard.length,
              separatorBuilder: (context, index) => const SizedBox(height: 8),
              itemBuilder: (context, index) {
                return _LeaderboardRow(
                  entry: MockDonorRanks.leaderboard[index],
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  DonorRankTier? _nextTier(DonorRankTier current) {
    final index = MockDonorRanks.tiers.indexOf(current);
    if (index < 0 || index >= MockDonorRanks.tiers.length - 1) return null;
    return MockDonorRanks.tiers[index + 1];
  }

  double _tierProgress(int amount, DonorRankTier tier) {
    final span = tier.maxAmount - tier.minAmount;
    if (span <= 0) return 1;
    return ((amount - tier.minAmount) / span).clamp(0.0, 1.0);
  }
}

class _YourRankCard extends StatelessWidget {
  const _YourRankCard({
    required this.displayName,
    required this.amountDonated,
    required this.tierName,
    required this.progress,
    this.nextTierName,
    this.amountToNext,
  });

  final String displayName;
  final int amountDonated;
  final String tierName;
  final double progress;
  final String? nextTierName;
  final int? amountToNext;

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
                      '$tierName Tier',
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
                DonationStore.formatPeso(amountDonated),
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
          if (nextTierName != null && amountToNext != null) ...[
            const SizedBox(height: 8),
            Text(
              '${DonationStore.formatPeso(amountToNext!)} to $nextTierName',
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

  final MockDonorLeaderboardEntry entry;

  Color? _medalColor(int rank) => switch (rank) {
    1 => const Color(0xFFFFD700),
    2 => const Color(0xFFC0C0C0),
    3 => const Color(0xFFCD7F32),
    _ => null,
  };

  @override
  Widget build(BuildContext context) {
    final medalColor = _medalColor(entry.rank);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.fieldBorder),
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
            backgroundColor: AppColors.secondary,
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
                  '${entry.campaignsSupported} campaigns',
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
            DonationStore.formatPeso(entry.amountDonated),
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w800,
              color: AppColors.primaryDark,
            ),
          ),
        ],
      ),
    );
  }
}
