import { Injectable } from '@nestjs/common';
import { resolveDepartmentScope } from 'src/shared/constants/departments';
import type { JwtPayload } from 'src/shared/types/jwt-payload';
import { RoleType } from '../../../infastructures/prisma/common/client';
import type {
  RankingPeriod,
  RankingSettingsDto,
  RankingTrendResponseDto,
  UpdateRankingSettingsDto,
  VolunteerRankingsResponseDto,
} from '../dto/rankings-site-dto';
import { RankingsRepository } from '../repositories/rankings-repository';
import {
  RankingsBoardService,
  periodStart,
  type BoardScope,
} from './rankings-board-service';

/** Months of history the participation chart covers. */
const TREND_MONTHS = 6;
const TREND_SIZE = 3;
const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/**
 * The portal's Rankings area. A director or admin sees the whole school; a
 * coordinator's board is cut to the volunteers whose school record assigns them
 * to the coordinator's own college, and one with no college on their profile gets
 * an empty board rather than everyone's.
 */
@Injectable()
export class RankingsSiteService {
  constructor(
    private readonly board: RankingsBoardService,
    private readonly repository: RankingsRepository,
  ) {}

  getSettings(): Promise<RankingSettingsDto> {
    return this.board.getSettings();
  }

  updateSettings(data: UpdateRankingSettingsDto): Promise<RankingSettingsDto> {
    return this.board.saveSettings(data);
  }

  async listVolunteers(
    caller: JwtPayload,
    period?: RankingPeriod,
  ): Promise<VolunteerRankingsResponseDto> {
    const now = new Date();
    const settings = await this.board.getSettings();
    const resolvedPeriod = period ?? settings.default_period;
    const scope = await this.scopeFor(caller);
    if (scope === null) {
      return { period: resolvedPeriod, department: null, entries: [] };
    }

    const rule = this.board.ruleOf(settings);
    const [entries, previous] = await Promise.all([
      this.board.buildBoard(
        rule,
        { since: periodStart(resolvedPeriod, now), now },
        scope.filter,
      ),
      this.board.previousRanks(rule, resolvedPeriod, now, scope.filter),
    ]);

    return {
      period: resolvedPeriod,
      department: scope.department,
      entries: entries.map((entry) => ({
        user_id: entry.userId,
        firstname: entry.firstname,
        lastname: entry.lastname,
        email: entry.email,
        department: entry.department,
        rank: entry.rank,
        previous_rank: previous.get(entry.userId) ?? null,
        points: entry.points,
        points_earned: entry.pointsEarned,
        points_deducted: entry.pointsDeducted,
        events_attended: entry.eventsAttended,
        events_missed: entry.eventsMissed,
        hours: entry.hours,
        current_streak: entry.currentStreak,
        last_active_at: entry.lastActiveAt?.toISOString() ?? null,
      })),
    };
  }

  /**
   * The top three's race over the last six months: cumulative points at each month
   * end, counted from the start of that stretch. The leaders are the current
   * period's, so the chart always explains the podium beside it.
   */
  async getTrend(
    caller: JwtPayload,
    period?: RankingPeriod,
  ): Promise<RankingTrendResponseDto> {
    const now = new Date();
    const settings = await this.board.getSettings();
    const resolvedPeriod = period ?? settings.default_period;
    const scope = await this.scopeFor(caller);
    const monthEnds = trendMonthEnds(now);
    const labels = monthEnds.map((end) => MONTH_LABELS[end.getMonth()]);
    if (scope === null) return { labels, series: [] };

    const rule = this.board.ruleOf(settings);
    const leaders = (
      await this.board.buildBoard(
        rule,
        { since: periodStart(resolvedPeriod, now), now },
        scope.filter,
      )
    ).slice(0, TREND_SIZE);
    if (leaders.length === 0) return { labels, series: [] };

    const since = new Date(
      now.getFullYear(),
      now.getMonth() - (TREND_MONTHS - 1),
      1,
    );
    const snapshots = await Promise.all(
      monthEnds.map((end) =>
        this.board.buildBoard(rule, { since, now: end }, scope.filter),
      ),
    );

    return {
      labels,
      series: leaders.map((leader) => ({
        user_id: leader.userId,
        name: `${leader.firstname} ${leader.lastname}`,
        rank: leader.rank,
        values: snapshots.map(
          (snapshot) =>
            snapshot.find((entry) => entry.userId === leader.userId)?.points ??
            0,
        ),
      })),
    };
  }

  /** Null when the caller may see nothing; `filter` empty for the whole school. */
  private async scopeFor(
    caller: JwtPayload,
  ): Promise<{ department: string | null; filter: BoardScope } | null> {
    if (caller.role_type !== RoleType.COORDINATOR) {
      return { department: null, filter: {} };
    }
    const user = await this.repository.findUserDepartment(caller.sub);
    const department = user?.portal_department?.trim() || null;
    if (!department) return null;
    return {
      department,
      filter: {
        volunteerDepartments: resolveDepartmentScope(department).aliases,
      },
    };
  }
}

/** The last six month ends, oldest first; the current month is cut at `now`. */
function trendMonthEnds(now: Date): Date[] {
  return Array.from({ length: TREND_MONTHS }, (_, index) => {
    const offset = TREND_MONTHS - 1 - index;
    if (offset === 0) return now;
    return new Date(now.getFullYear(), now.getMonth() - offset + 1, 1);
  });
}
