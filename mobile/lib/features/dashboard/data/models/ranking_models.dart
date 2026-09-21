import 'dart:ui' show Color;

/// The avatar-frame designs the portal's Customization page can pick. Kept in
/// step with `site/src/constants/rank-frames.ts`; an unknown value draws as
/// [ring] so a new preset never blanks the frame.
enum RankFrameDesign {
  aurora,
  laurel,
  shield,
  orbit,
  crown,
  starburst,
  blossom,
  gear,
  flame,
  prism,
  halo,
  ring;

  static RankFrameDesign fromWire(String? value) => values.firstWhere(
    (design) => design.name == value,
    orElse: () => RankFrameDesign.ring,
  );
}

/// One rung of the ladder the portal cut: the badge frame drawn around every
/// avatar whose standing falls into it.
class RankTier {
  const RankTier({
    required this.id,
    required this.label,
    required this.maxRank,
    required this.frame,
    required this.colorFrom,
    required this.colorTo,
  });

  factory RankTier.fromJson(Map<String, dynamic> json) {
    return RankTier(
      id: json['id'] as String,
      label: json['label'] as String? ?? '',
      maxRank: json['max_rank'] as int?,
      frame: RankFrameDesign.fromWire(json['frame'] as String?),
      colorFrom: _hexColor(json['color_from'] as String?),
      colorTo: _hexColor(json['color_to'] as String?),
    );
  }

  final String id;
  final String label;

  /// Highest standing still in this tier; null for the catch-all last tier.
  final int? maxRank;
  final RankFrameDesign frame;
  final Color colorFrom;
  final Color colorTo;

  static Color _hexColor(String? hex) {
    final value = hex?.replaceFirst('#', '');
    if (value == null || value.length != 6) return const Color(0xFF64748B);
    return Color(int.parse('FF$value', radix: 16));
  }
}

/// A row of the leaderboard — just what the card needs.
class LeaderboardEntry {
  const LeaderboardEntry({
    required this.userId,
    required this.displayName,
    required this.department,
    required this.rank,
    required this.points,
    required this.eventsAttended,
    required this.tierId,
    required this.isMe,
  });

  factory LeaderboardEntry.fromJson(Map<String, dynamic> json) {
    return LeaderboardEntry(
      userId: json['user_id'] as String,
      displayName: json['display_name'] as String? ?? '',
      department: json['department'] as String?,
      rank: json['rank'] as int,
      points: json['points'] as int? ?? 0,
      eventsAttended: json['events_attended'] as int? ?? 0,
      tierId: json['tier_id'] as String? ?? '',
      isMe: json['is_me'] as bool? ?? false,
    );
  }

  final String userId;
  final String displayName;
  final String? department;
  final int rank;
  final int points;
  final int eventsAttended;
  final String tierId;
  final bool isMe;
}

/// The volunteer's own standing, present even when they sit outside the list.
class LeaderboardMe {
  const LeaderboardMe({
    required this.rank,
    required this.points,
    required this.pointsEarned,
    required this.pointsDeducted,
    required this.eventsAttended,
    required this.eventsMissed,
    required this.currentStreak,
    required this.nextAbsencePenalty,
    required this.tierId,
  });

  factory LeaderboardMe.fromJson(Map<String, dynamic> json) {
    return LeaderboardMe(
      rank: json['rank'] as int?,
      points: json['points'] as int? ?? 0,
      pointsEarned: json['points_earned'] as int? ?? 0,
      pointsDeducted: json['points_deducted'] as int? ?? 0,
      eventsAttended: json['events_attended'] as int? ?? 0,
      eventsMissed: json['events_missed'] as int? ?? 0,
      currentStreak: json['current_streak'] as int? ?? 0,
      nextAbsencePenalty: json['next_absence_penalty'] as int? ?? 0,
      tierId: json['tier_id'] as String? ?? '',
    );
  }

  /// Null until the volunteer has a ruled attendance in the period.
  final int? rank;
  final int points;
  final int pointsEarned;
  final int pointsDeducted;
  final int eventsAttended;
  final int eventsMissed;

  /// Straight misses still counting against the next one.
  final int currentStreak;

  /// What one more miss would cost right now.
  final int nextAbsencePenalty;
  final String tierId;
}

/// Everything `GET /rankings/leaderboard` returns: the rule, the ladder, the
/// top list and the caller's own row.
class Leaderboard {
  const Leaderboard({
    required this.period,
    required this.pointsPerAttendance,
    required this.absencePenaltyStep,
    required this.absenceResetDays,
    required this.tiers,
    required this.totalRanked,
    required this.entries,
    required this.me,
  });

  factory Leaderboard.fromJson(Map<String, dynamic> json) {
    return Leaderboard(
      period: json['period'] as String? ?? 'month',
      pointsPerAttendance: json['points_per_attendance'] as int? ?? 10,
      absencePenaltyStep: json['absence_penalty_step'] as int? ?? 2,
      absenceResetDays: json['absence_reset_days'] as int? ?? 7,
      tiers: (json['tiers'] as List<dynamic>? ?? const [])
          .map((tier) => RankTier.fromJson(tier as Map<String, dynamic>))
          .toList(),
      totalRanked: json['total_ranked'] as int? ?? 0,
      entries: (json['entries'] as List<dynamic>? ?? const [])
          .map((e) => LeaderboardEntry.fromJson(e as Map<String, dynamic>))
          .toList(),
      me: LeaderboardMe.fromJson(json['me'] as Map<String, dynamic>),
    );
  }

  final String period;
  final int pointsPerAttendance;
  final int absencePenaltyStep;
  final int absenceResetDays;

  /// Highest tier first; the last one is the catch-all.
  final List<RankTier> tiers;
  final int totalRanked;
  final List<LeaderboardEntry> entries;
  final LeaderboardMe me;

  /// The tier a standing falls into; the catch-all when unranked.
  RankTier? tierForRank(int? rank) {
    if (tiers.isEmpty) return null;
    if (rank == null) return tiers.last;
    for (final tier in tiers) {
      final max = tier.maxRank;
      if (max == null || rank <= max) return tier;
    }
    return tiers.last;
  }

  RankTier? tierById(String id) {
    for (final tier in tiers) {
      if (tier.id == id) return tier;
    }
    return tiers.isEmpty ? null : tiers.last;
  }

  /// The rung just above the caller's, and how many places away it is.
  ({RankTier tier, int placesToClimb})? nextTierFor(int? rank) {
    final current = tierForRank(rank);
    if (current == null) return null;
    final index = tiers.indexOf(current);
    if (index <= 0) return null;
    final next = tiers[index - 1];
    final target = next.maxRank ?? 1;
    return (tier: next, placesToClimb: (rank ?? totalRanked + 1) - target);
  }
}

/// A row of the donor leaderboard.
class DonorLeaderboardEntry {
  const DonorLeaderboardEntry({
    required this.userId,
    required this.displayName,
    required this.rank,
    required this.points,
    required this.amount,
    required this.donations,
    required this.tierId,
    required this.isMe,
  });

  factory DonorLeaderboardEntry.fromJson(Map<String, dynamic> json) {
    return DonorLeaderboardEntry(
      userId: json['user_id'] as String,
      displayName: json['display_name'] as String? ?? '',
      rank: json['rank'] as int,
      points: json['points'] as int? ?? 0,
      amount: (json['amount'] as num?)?.toInt() ?? 0,
      donations: json['donations'] as int? ?? 0,
      tierId: json['tier_id'] as String? ?? '',
      isMe: json['is_me'] as bool? ?? false,
    );
  }

  final String userId;
  final String displayName;
  final int rank;
  final int points;

  /// Confirmed pesos in the period — money paid plus the credited goods value.
  final int amount;
  final int donations;
  final String tierId;
  final bool isMe;
}

/// The donor's own standing, present even when they sit outside the list.
class DonorLeaderboardMe {
  const DonorLeaderboardMe({
    required this.rank,
    required this.points,
    required this.amount,
    required this.moneyAmount,
    required this.goodsAmount,
    required this.donations,
    required this.tierId,
  });

  factory DonorLeaderboardMe.fromJson(Map<String, dynamic> json) {
    return DonorLeaderboardMe(
      rank: json['rank'] as int?,
      points: json['points'] as int? ?? 0,
      amount: (json['amount'] as num?)?.toInt() ?? 0,
      moneyAmount: (json['money_amount'] as num?)?.toInt() ?? 0,
      goodsAmount: (json['goods_amount'] as num?)?.toInt() ?? 0,
      donations: json['donations'] as int? ?? 0,
      tierId: json['tier_id'] as String? ?? '',
    );
  }

  /// Null until a donation of theirs was confirmed in the period.
  final int? rank;
  final int points;
  final int amount;
  final int moneyAmount;
  final int goodsAmount;
  final int donations;
  final String tierId;
}

/// Everything `GET /rankings/donors/leaderboard` returns: the rate, the same
/// tier ladder the volunteers wear, the top list and the caller's own row.
class DonorLeaderboard {
  const DonorLeaderboard({
    required this.period,
    required this.pesosPerPoint,
    required this.tiers,
    required this.totalRanked,
    required this.entries,
    required this.me,
  });

  factory DonorLeaderboard.fromJson(Map<String, dynamic> json) {
    return DonorLeaderboard(
      period: json['period'] as String? ?? 'month',
      pesosPerPoint: json['donor_pesos_per_point'] as int? ?? 100,
      tiers: (json['tiers'] as List<dynamic>? ?? const [])
          .map((tier) => RankTier.fromJson(tier as Map<String, dynamic>))
          .toList(),
      totalRanked: json['total_ranked'] as int? ?? 0,
      entries: (json['entries'] as List<dynamic>? ?? const [])
          .map((e) => DonorLeaderboardEntry.fromJson(e as Map<String, dynamic>))
          .toList(),
      me: DonorLeaderboardMe.fromJson(json['me'] as Map<String, dynamic>),
    );
  }

  final String period;

  /// One point for every this many confirmed pesos — the portal's criterion.
  final int pesosPerPoint;
  final List<RankTier> tiers;
  final int totalRanked;
  final List<DonorLeaderboardEntry> entries;
  final DonorLeaderboardMe me;

  RankTier? tierForRank(int? rank) {
    if (tiers.isEmpty) return null;
    if (rank == null) return tiers.last;
    for (final tier in tiers) {
      final max = tier.maxRank;
      if (max == null || rank <= max) return tier;
    }
    return tiers.last;
  }

  RankTier? tierById(String id) {
    for (final tier in tiers) {
      if (tier.id == id) return tier;
    }
    return tiers.isEmpty ? null : tiers.last;
  }

  /// The rung just above the caller's, and how many places away it is.
  ({RankTier tier, int placesToClimb})? nextTierFor(int? rank) {
    final current = tierForRank(rank);
    if (current == null) return null;
    final index = tiers.indexOf(current);
    if (index <= 0) return null;
    final next = tiers[index - 1];
    final target = next.maxRank ?? 1;
    return (tier: next, placesToClimb: (rank ?? totalRanked + 1) - target);
  }
}
