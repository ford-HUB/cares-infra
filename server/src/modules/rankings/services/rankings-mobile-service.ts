import { Injectable } from '@nestjs/common';
import type { RankingPeriod } from '../dto/rankings-site-dto';
import type { LeaderboardResponseDto } from '../dto/rankings-mobile-dto';
import { nextAbsencePenalty } from './ranking-scoring';
import { RankingsBoardService, periodStart } from './rankings-board-service';

/** Rows the app lists; the caller's own row is always appended if it fell outside. */
const LEADERBOARD_SIZE = 50;

/** The volunteer app's leaderboard: the whole school, with the caller picked out. */
@Injectable()
export class RankingsMobileService {
  constructor(private readonly board: RankingsBoardService) {}

  async getLeaderboard(
    userId: string,
    period?: RankingPeriod,
  ): Promise<LeaderboardResponseDto> {
    const now = new Date();
    const settings = await this.board.getSettings();
    const resolvedPeriod = period ?? settings.default_period;
    const rule = this.board.ruleOf(settings);
    const entries = await this.board.buildBoard(rule, {
      since: periodStart(resolvedPeriod, now),
      now,
    });

    const mine = entries.find((entry) => entry.userId === userId) ?? null;
    const listed = entries.slice(0, LEADERBOARD_SIZE);
    if (mine && !listed.includes(mine)) listed.push(mine);

    return {
      period: resolvedPeriod,
      points_per_attendance: settings.points_per_attendance,
      absence_penalty_step: settings.absence_penalty_step,
      absence_reset_days: settings.absence_reset_days,
      tiers: settings.tiers,
      total_ranked: entries.length,
      entries: listed.map((entry) => ({
        user_id: entry.userId,
        display_name: `${entry.firstname} ${entry.lastname}`.trim(),
        department: entry.department,
        rank: entry.rank,
        points: entry.points,
        events_attended: entry.eventsAttended,
        tier_id: this.board.tierForRank(entry.rank, settings.tiers).id,
        is_me: entry.userId === userId,
      })),
      me: {
        rank: mine?.rank ?? null,
        points: mine?.points ?? 0,
        points_earned: mine?.pointsEarned ?? 0,
        points_deducted: mine?.pointsDeducted ?? 0,
        events_attended: mine?.eventsAttended ?? 0,
        events_missed: mine?.eventsMissed ?? 0,
        current_streak: mine?.currentStreak ?? 0,
        next_absence_penalty: nextAbsencePenalty(
          mine?.currentStreak ?? 0,
          rule,
        ),
        tier_id: this.board.tierForRank(mine?.rank ?? null, settings.tiers).id,
      },
    };
  }
}
