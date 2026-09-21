import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/dashboard/data/models/ranking_models.dart';
import 'package:mobile/features/dashboard/presentation/widgets/rank_tier_frame.dart';

/// Period selector for the Ranks tab.
class RankPeriodChips extends StatelessWidget {
  const RankPeriodChips({
    super.key,
    required this.periods,
    required this.selected,
    required this.onSelected,
  });

  final List<({String value, String label})> periods;
  final String selected;
  final ValueChanged<String> onSelected;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          for (final period in periods) ...[
            ChoiceChip(
              label: Text(period.label),
              selected: period.value == selected,
              onSelected: (_) => onSelected(period.value),
              selectedColor: AppColors.primaryDark,
              backgroundColor: Colors.white,
              labelStyle: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: period.value == selected
                    ? Colors.white
                    : AppColors.primaryDark,
              ),
              side: BorderSide(
                color: period.value == selected
                    ? AppColors.primaryDark
                    : AppColors.fieldBorder,
              ),
              showCheckmark: false,
              visualDensity: VisualDensity.compact,
            ),
            const SizedBox(width: 8),
          ],
        ],
      ),
    );
  }
}

/// The volunteer's own standing: rank, tier frame, points, and how the total
/// came about — what was earned, what a missed registration cost, and what
/// the next one would cost while a streak is live.
class YourRankCard extends StatelessWidget {
  const YourRankCard({
    super.key,
    required this.board,
    required this.displayName,
  });

  final Leaderboard board;
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
                          ? 'Unranked · attend an event to enter'
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
                label: 'Attended',
                value: '${me.eventsAttended}',
                detail: '+${me.pointsEarned}',
                detailColor: AppColors.light,
              ),
              _Stat(
                label: 'Missed',
                value: '${me.eventsMissed}',
                detail: '−${me.pointsDeducted}',
                detailColor: me.pointsDeducted > 0
                    ? const Color(0xFFFFAB91)
                    : Colors.white70,
              ),
              _Stat(
                label: 'Per event',
                value: '+${board.pointsPerAttendance}',
                detail: 'miss −${board.absencePenaltyStep}',
                detailColor: Colors.white70,
              ),
            ],
          ),
          if (me.currentStreak > 0) ...[
            const SizedBox(height: 12),
            _StreakWarning(me: me, resetDays: board.absenceResetDays),
          ],
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
  const _Stat({
    required this.label,
    required this.value,
    required this.detail,
    required this.detailColor,
  });

  final String label;
  final String value;
  final String detail;
  final Color detailColor;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.65),
              fontSize: 11,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 2),
          Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Text(
                value,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(width: 5),
              Text(
                detail,
                style: TextStyle(
                  color: detailColor,
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// A live streak: the penalty grows with each straight miss inside the window,
/// so the card says exactly what skipping the next registration would cost.
class _StreakWarning extends StatelessWidget {
  const _StreakWarning({required this.me, required this.resetDays});

  final LeaderboardMe me;
  final int resetDays;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
      decoration: BoxDecoration(
        color: const Color(0xFFFFAB91).withValues(alpha: 0.16),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: const Color(0xFFFFAB91).withValues(alpha: 0.5),
        ),
      ),
      child: Row(
        children: [
          const Icon(
            Icons.warning_amber_rounded,
            size: 18,
            color: Color(0xFFFFAB91),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              '${me.currentStreak} straight ${me.currentStreak == 1 ? 'miss' : 'misses'} — skipping your next registration costs −${me.nextAbsencePenalty}. Attend an event, or wait $resetDays days, to reset it.',
              style: const TextStyle(
                color: Colors.white,
                fontSize: 12,
                fontWeight: FontWeight.w500,
                height: 1.3,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// One leaderboard row. The avatar wears the frame of the tier its standing
/// falls into; the caller's own row is tinted.
class LeaderboardRow extends StatelessWidget {
  const LeaderboardRow({super.key, required this.entry, required this.tier});

  final LeaderboardEntry entry;
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
                    '${entry.eventsAttended} ${entry.eventsAttended == 1 ? 'event' : 'events'}',
                    if (entry.department != null) entry.department!,
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

class YourRankSkeleton extends StatelessWidget {
  const YourRankSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 148,
      decoration: BoxDecoration(
        color: AppColors.primaryDark.withValues(alpha: 0.35),
        borderRadius: BorderRadius.circular(16),
      ),
      child: const Center(
        child: SizedBox(
          width: 22,
          height: 22,
          child: CircularProgressIndicator(
            strokeWidth: 2.5,
            color: Colors.white,
          ),
        ),
      ),
    );
  }
}

class RanksError extends StatelessWidget {
  const RanksError({super.key, required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.fieldBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'The leaderboard could not be loaded.',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: AppColors.primaryDark,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            message,
            style: TextStyle(
              fontSize: 12,
              color: AppColors.secondary.withValues(alpha: 0.9),
            ),
          ),
          const SizedBox(height: 10),
          TextButton.icon(
            onPressed: onRetry,
            icon: const Icon(Icons.refresh_rounded, size: 18),
            label: const Text('Try again'),
          ),
        ],
      ),
    );
  }
}

class RanksEmpty extends StatelessWidget {
  const RanksEmpty({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.fieldBorder),
      ),
      child: Text(
        'No ruled attendance in this period yet. Standings appear once an event ends and attendance is validated.',
        textAlign: TextAlign.center,
        style: TextStyle(
          fontSize: 13,
          fontWeight: FontWeight.w500,
          color: AppColors.secondary.withValues(alpha: 0.95),
          height: 1.4,
        ),
      ),
    );
  }
}
