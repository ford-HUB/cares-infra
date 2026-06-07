enum LeaderboardCategory { volunteers, donors }

class LeaderboardEntry {
  const LeaderboardEntry({
    required this.rank,
    required this.name,
    required this.avatarEmoji,
    required this.displayValue,
    required this.subtitle,
    required this.score,
    this.isCurrentUser = false,
  });

  final int rank;
  final String name;
  final String avatarEmoji;
  final String displayValue;
  final String subtitle;
  final int score;
  final bool isCurrentUser;
}

class _LeaderboardSeed {
  const _LeaderboardSeed({
    required this.name,
    required this.avatarEmoji,
    required this.score,
    required this.subtitle,
  });

  final String name;
  final String avatarEmoji;
  final int score;
  final String subtitle;
}

const _volunteerSeeds = [
  _LeaderboardSeed(
    name: 'Maria',
    avatarEmoji: '👩',
    score: 1240,
    subtitle: '12 events attended',
  ),
  _LeaderboardSeed(
    name: 'Juan',
    avatarEmoji: '👨',
    score: 980,
    subtitle: '10 events attended',
  ),
  _LeaderboardSeed(
    name: 'Ana',
    avatarEmoji: '👩',
    score: 870,
    subtitle: '9 events attended',
  ),
  _LeaderboardSeed(
    name: 'Carlos Gomez',
    avatarEmoji: '👨',
    score: 750,
    subtitle: '10 events attended',
  ),
  _LeaderboardSeed(
    name: 'Lena Bautista',
    avatarEmoji: '👩',
    score: 620,
    subtitle: '9 events attended',
  ),
  _LeaderboardSeed(
    name: 'Rico Mendoza',
    avatarEmoji: '👨',
    score: 580,
    subtitle: '8 events attended',
  ),
  _LeaderboardSeed(
    name: 'Sofia Tan',
    avatarEmoji: '👩',
    score: 510,
    subtitle: '7 events attended',
  ),
  _LeaderboardSeed(
    name: 'Mark Villanueva',
    avatarEmoji: '👨',
    score: 440,
    subtitle: '6 events attended',
  ),
];

const _donorSeeds = [
  _LeaderboardSeed(
    name: 'Rosa',
    avatarEmoji: '👩',
    score: 15000,
    subtitle: '12 donations',
  ),
  _LeaderboardSeed(
    name: 'Bong',
    avatarEmoji: '👨',
    score: 12400,
    subtitle: '10 donations',
  ),
  _LeaderboardSeed(
    name: 'Celia',
    avatarEmoji: '👩',
    score: 9800,
    subtitle: '8 donations',
  ),
  _LeaderboardSeed(
    name: 'Diego Lim',
    avatarEmoji: '👨',
    score: 7200,
    subtitle: '4 donations',
  ),
  _LeaderboardSeed(
    name: 'Fely Cruz',
    avatarEmoji: '👩',
    score: 6100,
    subtitle: '6 donations',
  ),
  _LeaderboardSeed(
    name: 'Gerry Ty',
    avatarEmoji: '👨',
    score: 5400,
    subtitle: '2 donations',
  ),
  _LeaderboardSeed(
    name: 'Helen Go',
    avatarEmoji: '👩',
    score: 4800,
    subtitle: '8 donations',
  ),
  _LeaderboardSeed(
    name: 'Ivan Uy',
    avatarEmoji: '👨',
    score: 3200,
    subtitle: '1 donation',
  ),
];

List<LeaderboardEntry> buildVolunteerLeaderboard({
  required String userName,
  required int userPoints,
  required int userEventsAttended,
}) {
  return _buildRankedLeaderboard(
    seeds: _volunteerSeeds,
    userName: userName,
    userScore: userPoints,
    userSubtitle: '$userEventsAttended event${userEventsAttended == 1 ? '' : 's'} attended',
    formatValue: (score) => '$score pts',
  );
}

List<LeaderboardEntry> buildDonorLeaderboard({
  required String userName,
  required int userTotalDonated,
  required int userDonationsCount,
}) {
  return _buildRankedLeaderboard(
    seeds: _donorSeeds,
    userName: userName,
    userScore: userTotalDonated,
    userSubtitle: '$userDonationsCount donation${userDonationsCount == 1 ? '' : 's'}',
    formatValue: _formatDonorValue,
  );
}

List<LeaderboardEntry> _buildRankedLeaderboard({
  required List<_LeaderboardSeed> seeds,
  required String userName,
  required int userScore,
  required String userSubtitle,
  required String Function(int score) formatValue,
}) {
  final displayName = userName.trim().isEmpty ? 'You' : userName.trim();

  final candidates = <({_LeaderboardSeed seed, bool isCurrentUser})>[
    for (final seed in seeds) (seed: seed, isCurrentUser: false),
    (
      seed: _LeaderboardSeed(
        name: displayName,
        avatarEmoji: '👤',
        score: userScore,
        subtitle: userSubtitle,
      ),
      isCurrentUser: true,
    ),
  ];

  candidates.sort((a, b) => b.seed.score.compareTo(a.seed.score));

  return [
    for (var i = 0; i < candidates.length; i++)
      LeaderboardEntry(
        rank: i + 1,
        name: candidates[i].seed.name,
        avatarEmoji: candidates[i].seed.avatarEmoji,
        displayValue: formatValue(candidates[i].seed.score),
        subtitle: candidates[i].seed.subtitle,
        score: candidates[i].seed.score,
        isCurrentUser: candidates[i].isCurrentUser,
      ),
  ];
}

String _formatDonorValue(int amount) {
  if (amount >= 1000) {
    final thousands = amount / 1000;
    final formatted = thousands >= 10
        ? thousands.toStringAsFixed(0)
        : thousands.toStringAsFixed(1);
    return '₱${formatted}k';
  }
  return '₱$amount';
}

List<LeaderboardEntry> leaderboardFor(LeaderboardCategory category) {
  return category == LeaderboardCategory.volunteers
      ? buildVolunteerLeaderboard(
          userName: 'You',
          userPoints: 0,
          userEventsAttended: 0,
        )
      : buildDonorLeaderboard(
          userName: 'You',
          userTotalDonated: 0,
          userDonationsCount: 0,
        );
}
