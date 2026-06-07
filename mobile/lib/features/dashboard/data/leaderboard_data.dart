enum LeaderboardCategory { volunteers, donors }

class LeaderboardEntry {
  const LeaderboardEntry({
    required this.rank,
    required this.name,
    required this.avatarEmoji,
    required this.displayValue,
    required this.subtitle,
  });

  final int rank;
  final String name;
  final String avatarEmoji;
  final String displayValue;
  final String subtitle;
}

const kVolunteerLeaderboard = [
  LeaderboardEntry(
    rank: 1,
    name: 'Maria',
    avatarEmoji: '👩',
    displayValue: '1240 pts',
    subtitle: '12 events attended',
  ),
  LeaderboardEntry(
    rank: 2,
    name: 'Juan',
    avatarEmoji: '👨',
    displayValue: '980 pts',
    subtitle: '10 events attended',
  ),
  LeaderboardEntry(
    rank: 3,
    name: 'Ana',
    avatarEmoji: '👩',
    displayValue: '870 pts',
    subtitle: '9 events attended',
  ),
  LeaderboardEntry(
    rank: 4,
    name: 'Carlos Gomez',
    avatarEmoji: '👨',
    displayValue: '750 pts',
    subtitle: '10 events attended',
  ),
  LeaderboardEntry(
    rank: 5,
    name: 'Lena Bautista',
    avatarEmoji: '👩',
    displayValue: '620 pts',
    subtitle: '9 events attended',
  ),
  LeaderboardEntry(
    rank: 6,
    name: 'Rico Mendoza',
    avatarEmoji: '👨',
    displayValue: '580 pts',
    subtitle: '8 events attended',
  ),
  LeaderboardEntry(
    rank: 7,
    name: 'Sofia Tan',
    avatarEmoji: '👩',
    displayValue: '510 pts',
    subtitle: '7 events attended',
  ),
  LeaderboardEntry(
    rank: 8,
    name: 'Mark Villanueva',
    avatarEmoji: '👨',
    displayValue: '440 pts',
    subtitle: '6 events attended',
  ),
];

const kDonorLeaderboard = [
  LeaderboardEntry(
    rank: 1,
    name: 'Rosa',
    avatarEmoji: '👩',
    displayValue: '₱15.0k',
    subtitle: '12 donations',
  ),
  LeaderboardEntry(
    rank: 2,
    name: 'Bong',
    avatarEmoji: '👨',
    displayValue: '₱12.4k',
    subtitle: '10 donations',
  ),
  LeaderboardEntry(
    rank: 3,
    name: 'Celia',
    avatarEmoji: '👩',
    displayValue: '₱9.8k',
    subtitle: '8 donations',
  ),
  LeaderboardEntry(
    rank: 4,
    name: 'Diego Lim',
    avatarEmoji: '👨',
    displayValue: '₱7.2k',
    subtitle: '4 donations',
  ),
  LeaderboardEntry(
    rank: 5,
    name: 'Fely Cruz',
    avatarEmoji: '👩',
    displayValue: '₱6.1k',
    subtitle: '6 donations',
  ),
  LeaderboardEntry(
    rank: 6,
    name: 'Gerry Ty',
    avatarEmoji: '👨',
    displayValue: '₱5.4k',
    subtitle: '2 donations',
  ),
  LeaderboardEntry(
    rank: 7,
    name: 'Helen Go',
    avatarEmoji: '👩',
    displayValue: '₱4.8k',
    subtitle: '8 donations',
  ),
  LeaderboardEntry(
    rank: 8,
    name: 'Ivan Uy',
    avatarEmoji: '👨',
    displayValue: '₱3.2k',
    subtitle: '1 donation',
  ),
];

List<LeaderboardEntry> leaderboardFor(LeaderboardCategory category) {
  return category == LeaderboardCategory.volunteers
      ? kVolunteerLeaderboard
      : kDonorLeaderboard;
}
