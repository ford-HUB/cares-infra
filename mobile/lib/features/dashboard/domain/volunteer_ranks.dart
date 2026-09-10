class RankTier {
  const RankTier({
    required this.name,
    required this.minPoints,
    required this.maxPoints,
    required this.iconName,
  });

  final String name;
  final int minPoints;
  final int maxPoints;
  final String iconName;
}

class LeaderboardEntry {
  const LeaderboardEntry({
    required this.rank,
    required this.displayName,
    required this.points,
    required this.hours,
    this.isCurrentUser = false,
  });

  final int rank;
  final String displayName;
  final int points;
  final int hours;
  final bool isCurrentUser;
}

/// Tier thresholds and helpers for the ranks UI.
abstract final class VolunteerRanks {
  static const tiers = [
    RankTier(name: 'Bronze', minPoints: 0, maxPoints: 499, iconName: 'bronze'),
    RankTier(
      name: 'Silver',
      minPoints: 500,
      maxPoints: 1499,
      iconName: 'silver',
    ),
    RankTier(name: 'Gold', minPoints: 1500, maxPoints: 2999, iconName: 'gold'),
    RankTier(
      name: 'Platinum',
      minPoints: 3000,
      maxPoints: 99999,
      iconName: 'platinum',
    ),
  ];

  static RankTier tierForPoints(int points) {
    for (final tier in tiers.reversed) {
      if (points >= tier.minPoints) return tier;
    }
    return tiers.first;
  }

  static RankTier? nextTier(RankTier current) {
    final index = tiers.indexOf(current);
    if (index < 0 || index >= tiers.length - 1) return null;
    return tiers[index + 1];
  }

  static double tierProgress(int points, RankTier tier) {
    final span = tier.maxPoints - tier.minPoints;
    if (span <= 0) return 1;
    return ((points - tier.minPoints) / span).clamp(0.0, 1.0);
  }
}
