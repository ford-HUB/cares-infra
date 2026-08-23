class DonorRankTier {
  const DonorRankTier({
    required this.name,
    required this.minAmount,
    required this.maxAmount,
  });

  final String name;
  final int minAmount;
  final int maxAmount;
}

class MockDonorLeaderboardEntry {
  const MockDonorLeaderboardEntry({
    required this.rank,
    required this.displayName,
    required this.amountDonated,
    required this.campaignsSupported,
    this.isCurrentUser = false,
  });

  final int rank;
  final String displayName;
  final int amountDonated;
  final int campaignsSupported;
  final bool isCurrentUser;
}

/// Mock-only donor leaderboard for the local donor dashboard prototype.
abstract final class MockDonorRanks {
  static const tiers = [
    DonorRankTier(name: 'Supporter', minAmount: 0, maxAmount: 999),
    DonorRankTier(name: 'Champion', minAmount: 1000, maxAmount: 4999),
    DonorRankTier(name: 'Benefactor', minAmount: 5000, maxAmount: 19999),
    DonorRankTier(name: 'Patron', minAmount: 20000, maxAmount: 999999),
  ];

  static DonorRankTier tierForAmount(int amount) {
    for (final tier in tiers) {
      if (amount >= tier.minAmount && amount <= tier.maxAmount) return tier;
    }
    return tiers.first;
  }

  static const List<MockDonorLeaderboardEntry> leaderboard = [
    MockDonorLeaderboardEntry(
      rank: 1,
      displayName: 'Maria Santos',
      amountDonated: 28400,
      campaignsSupported: 9,
    ),
    MockDonorLeaderboardEntry(
      rank: 2,
      displayName: 'Juan Dela Cruz',
      amountDonated: 21500,
      campaignsSupported: 7,
    ),
    MockDonorLeaderboardEntry(
      rank: 3,
      displayName: 'Ana Reyes',
      amountDonated: 17800,
      campaignsSupported: 6,
    ),
    MockDonorLeaderboardEntry(
      rank: 4,
      displayName: 'Carlos Mendoza',
      amountDonated: 12200,
      campaignsSupported: 5,
    ),
    MockDonorLeaderboardEntry(
      rank: 5,
      displayName: 'Sofia Lim',
      amountDonated: 9600,
      campaignsSupported: 4,
    ),
    MockDonorLeaderboardEntry(
      rank: 6,
      displayName: 'Miguel Torres',
      amountDonated: 6400,
      campaignsSupported: 3,
    ),
    MockDonorLeaderboardEntry(
      rank: 7,
      displayName: 'Elena Garcia',
      amountDonated: 4100,
      campaignsSupported: 3,
    ),
    MockDonorLeaderboardEntry(
      rank: 8,
      displayName: 'Rico Fernandez',
      amountDonated: 2950,
      campaignsSupported: 2,
    ),
    MockDonorLeaderboardEntry(
      rank: 9,
      displayName: 'Liza Cruz',
      amountDonated: 1800,
      campaignsSupported: 2,
    ),
    MockDonorLeaderboardEntry(
      rank: 10,
      displayName: 'Paolo Rivera',
      amountDonated: 1250,
      campaignsSupported: 1,
    ),
  ];
}
