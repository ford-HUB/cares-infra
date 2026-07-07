class MockRankTier {
  const MockRankTier({
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

class MockLeaderboardEntry {
  const MockLeaderboardEntry({
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

abstract final class MockRanks {
  static const tiers = [
    MockRankTier(name: 'Bronze', minPoints: 0, maxPoints: 499, iconName: 'bronze'),
    MockRankTier(name: 'Silver', minPoints: 500, maxPoints: 1499, iconName: 'silver'),
    MockRankTier(name: 'Gold', minPoints: 1500, maxPoints: 2999, iconName: 'gold'),
    MockRankTier(name: 'Platinum', minPoints: 3000, maxPoints: 99999, iconName: 'platinum'),
  ];

  static const currentUserRank = 12;
  static const currentUserPoints = 240;

  static MockRankTier tierForPoints(int points) {
    for (final tier in tiers) {
      if (points >= tier.minPoints && points <= tier.maxPoints) {
        return tier;
      }
    }
    return tiers.first;
  }

  static const List<MockLeaderboardEntry> leaderboard = [
    MockLeaderboardEntry(rank: 1, displayName: 'Maria Santos', points: 2840, hours: 86),
    MockLeaderboardEntry(rank: 2, displayName: 'Juan Dela Cruz', points: 2510, hours: 72),
    MockLeaderboardEntry(rank: 3, displayName: 'Ana Reyes', points: 2180, hours: 65),
    MockLeaderboardEntry(rank: 4, displayName: 'Carlos Mendoza', points: 1920, hours: 58),
    MockLeaderboardEntry(rank: 5, displayName: 'Sofia Lim', points: 1750, hours: 51),
    MockLeaderboardEntry(rank: 6, displayName: 'Miguel Torres', points: 1540, hours: 47),
    MockLeaderboardEntry(rank: 7, displayName: 'Elena Garcia', points: 1320, hours: 40),
    MockLeaderboardEntry(rank: 8, displayName: 'Rico Fernandez', points: 1180, hours: 36),
    MockLeaderboardEntry(rank: 9, displayName: 'Liza Cruz', points: 980, hours: 30),
    MockLeaderboardEntry(rank: 10, displayName: 'Paolo Rivera', points: 860, hours: 26),
    MockLeaderboardEntry(rank: 11, displayName: 'Nina Lopez', points: 520, hours: 18),
    MockLeaderboardEntry(
      rank: currentUserRank,
      displayName: 'You',
      points: currentUserPoints,
      hours: 6,
      isCurrentUser: true,
    ),
    MockLeaderboardEntry(rank: 13, displayName: 'Mark Tan', points: 210, hours: 8),
    MockLeaderboardEntry(rank: 14, displayName: 'Joyce Wu', points: 180, hours: 5),
    MockLeaderboardEntry(rank: 15, displayName: 'Ben Cruz', points: 120, hours: 4),
  ];
}
