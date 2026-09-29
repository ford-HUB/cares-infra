import { Injectable } from '@nestjs/common';
import { resolveDepartmentScope } from 'src/shared/constants/departments';
import type { JwtPayload } from 'src/shared/types/jwt-payload';
import { RoleType } from '../../../infastructures/prisma/common/client';
import type {
  DepartmentRankingsResponseDto,
  DonorRankingsResponseDto,
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

  /**
   * The donor standings — the whole school for every portal role, since a
   * donation is not filed under a college the way a volunteer is.
   */
  async listDonors(period?: RankingPeriod): Promise<DonorRankingsResponseDto> {
    const now = new Date();
    const settings = await this.board.getSettings();
    const resolvedPeriod = period ?? settings.default_period;
    const rate = settings.donor_pesos_per_point;
    const [entries, previous] = await Promise.all([
      this.board.buildDonorBoard(rate, {
        since: periodStart(resolvedPeriod, now),
        now,
      }),
      this.board.previousDonorRanks(rate, resolvedPeriod, now),
    ]);

    return {
      period: resolvedPeriod,
      donor_pesos_per_point: rate,
      entries: entries.map((entry) => ({
        user_id: entry.userId,
        name: entry.name,
        email: entry.email,
        rank: entry.rank,
        previous_rank: previous.get(entry.userId) ?? null,
        points: entry.points,
        amount: entry.amount,
        money_amount: entry.moneyAmount,
        goods_amount: entry.goodsAmount,
        donations: entry.donations,
        last_donated_at: entry.lastDonatedAt?.toISOString() ?? null,
      })),
    };
  }

  /** The top three donors' race over the last six months, like the volunteer chart. */
  async getDonorTrend(
    period?: RankingPeriod,
  ): Promise<RankingTrendResponseDto> {
    const now = new Date();
    const settings = await this.board.getSettings();
    const resolvedPeriod = period ?? settings.default_period;
    const rate = settings.donor_pesos_per_point;
    const monthEnds = trendMonthEnds(now);
    const labels = monthEnds.map((end) => MONTH_LABELS[end.getMonth()]);

    const leaders = (
      await this.board.buildDonorBoard(rate, {
        since: periodStart(resolvedPeriod, now),
        now,
      })
    ).slice(0, TREND_SIZE);
    if (leaders.length === 0) return { labels, series: [] };

    const since = new Date(
      now.getFullYear(),
      now.getMonth() - (TREND_MONTHS - 1),
      1,
    );
    const snapshots = await Promise.all(
      monthEnds.map((end) =>
        this.board.buildDonorBoard(rate, { since, now: end }),
      ),
    );

    return {
      labels,
      series: leaders.map((leader) => ({
        user_id: leader.userId,
        name: leader.name,
        rank: leader.rank,
        values: snapshots.map(
          (snapshot) =>
            snapshot.find((entry) => entry.userId === leader.userId)?.points ??
            0,
        ),
      })),
    };
  }

  /**
   * The college standings — volunteer hours by the volunteer's college, confirmed
   * pesos by the college whose event received them. School-wide for every role:
   * the point of the board is to compare colleges against each other.
   */
  async listDepartments(
    period?: RankingPeriod,
  ): Promise<DepartmentRankingsResponseDto> {
    const now = new Date();
    const settings = await this.board.getSettings();
    const resolvedPeriod = period ?? settings.default_period;
    const rule = this.board.ruleOf(settings);
    const [board, previous] = await Promise.all([
      this.board.buildDepartmentBoard(rule, {
        since: periodStart(resolvedPeriod, now),
        now,
      }),
      this.board.previousDepartmentRanks(rule, resolvedPeriod, now),
    ]);

    return {
      period: resolvedPeriod,
      entries: board.entries.map((entry) => ({
        key: entry.key,
        name: entry.name,
        code: entry.code,
        volunteers: entry.volunteers,
        events_attended: entry.eventsAttended,
        hours: entry.hours,
        donation_amount: entry.donationAmount,
        donations: entry.donations,
        score: entry.score,
        ranks: entry.ranks,
        // A college new since last window has no standing to move from.
        previous_ranks: previous?.get(entry.key) ?? null,
      })),
      unattributed: {
        hours: board.unattributed.hours,
        donation_amount: board.unattributed.donationAmount,
      },
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
