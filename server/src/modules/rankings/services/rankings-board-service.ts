import { Injectable } from '@nestjs/common';
import {
  DEFAULT_GOODS_TYPE_VALUES,
  GOODS_TYPE_IDS,
} from '../../../shared/constants/goods-types';
import type {
  GoodsTypeValuesDto,
  RankingPeriod,
  RankingSettingsDto,
  RankingTierDto,
  UpdateRankingSettingsDto,
} from '../dto/rankings-site-dto';
import {
  GoodsTypeValuesSchema,
  RankingTierSchema,
  RANKING_PERIODS,
} from '../validators/rankings-site-validator';
import {
  RankingsRepository,
  type ConfirmedDonationRow,
  type RankedAttendanceFilter,
  type RankedAttendanceRow,
} from '../repositories/rankings-repository';
import {
  scoreAttendance,
  type ScoredAttendance,
  type ScoringRule,
  type VolunteerScore,
} from './ranking-scoring';

/** The ladder as shipped — mirrors the portal's `RANKING_DEFAULT_TIERS`. */
export const DEFAULT_RANKING_TIERS: RankingTierDto[] = [
  {
    id: 'mythic',
    label: 'Mythic',
    max_rank: 1,
    frame: 'aurora',
    color_from: '#facc15',
    color_to: '#f97316',
  },
  {
    id: 'legend',
    label: 'Legend',
    max_rank: 3,
    frame: 'crown',
    color_from: '#a78bfa',
    color_to: '#6366f1',
  },
  {
    id: 'epic',
    label: 'Epic',
    max_rank: 5,
    frame: 'orbit',
    color_from: '#38bdf8',
    color_to: '#2563eb',
  },
  {
    id: 'elite',
    label: 'Elite',
    max_rank: 8,
    frame: 'shield',
    color_from: '#34d399',
    color_to: '#0f766e',
  },
  {
    id: 'warrior',
    label: 'Warrior',
    max_rank: null,
    frame: 'ring',
    color_from: '#cbd5e1',
    color_to: '#64748b',
  },
];

export const DEFAULT_RANKING_SETTINGS: Omit<RankingSettingsDto, 'updated_at'> =
  {
    points_per_attendance: 10,
    absence_penalty_step: 2,
    absence_reset_days: 7,
    donor_pesos_per_point: 100,
    goods_type_values: DEFAULT_GOODS_TYPE_VALUES,
    default_period: 'month',
    tiers: DEFAULT_RANKING_TIERS,
  };

/** A volunteer's identity plus their score — the board before ranks are dealt. */
export interface RankedVolunteer extends VolunteerScore {
  userId: string;
  firstname: string;
  lastname: string;
  email: string;
  department: string | null;
  rank: number;
}

/** A donor's identity plus their confirmed giving — the donor board before ranks. */
export interface RankedDonor {
  userId: string;
  name: string;
  email: string;
  rank: number;
  points: number;
  /** Money paid plus the credited value of goods, whole pesos. */
  amount: number;
  moneyAmount: number;
  goodsAmount: number;
  donations: number;
  lastDonatedAt: Date | null;
}

export interface BoardScope {
  /** Restrict to volunteers whose school record files them under these college spellings. */
  volunteerDepartments?: string[];
}

/**
 * The scored, ranked volunteer board — shared by the portal's standings and the
 * app's leaderboard so the two never disagree on a number.
 */
@Injectable()
export class RankingsBoardService {
  constructor(private readonly repository: RankingsRepository) {}

  async getSettings(): Promise<RankingSettingsDto> {
    const row = await this.repository.findSettings();
    if (!row) {
      return {
        ...DEFAULT_RANKING_SETTINGS,
        updated_at: new Date(0).toISOString(),
      };
    }
    const tiers = RankingTierSchema.array().safeParse(row.tiers);
    const goodsValues = GoodsTypeValuesSchema.safeParse(row.goods_type_values);
    return {
      points_per_attendance: row.points_per_attendance,
      absence_penalty_step: row.absence_penalty_step,
      absence_reset_days: row.absence_reset_days,
      donor_pesos_per_point: row.donor_pesos_per_point,
      // A type added to the catalog after the row was saved takes its default.
      goods_type_values: {
        ...DEFAULT_GOODS_TYPE_VALUES,
        ...(goodsValues.success ? goodsValues.data : {}),
      },
      default_period: isPeriod(row.default_period)
        ? row.default_period
        : 'month',
      tiers:
        tiers.success && tiers.data.length > 0
          ? tiers.data
          : DEFAULT_RANKING_TIERS,
      updated_at: row.updatedAt.toISOString(),
    };
  }

  async saveSettings(
    data: UpdateRankingSettingsDto,
  ): Promise<RankingSettingsDto> {
    await this.repository.saveSettings(data);
    return this.getSettings();
  }

  ruleOf(settings: RankingSettingsDto): ScoringRule {
    return {
      pointsPerAttendance: settings.points_per_attendance,
      absencePenaltyStep: settings.absence_penalty_step,
      absenceResetDays: settings.absence_reset_days,
    };
  }

  /**
   * The standings for one window. Ties on points are broken by attendance count and
   * then by name, so the order is stable between refreshes.
   */
  async buildBoard(
    rule: ScoringRule,
    window: { since?: Date; now: Date },
    scope: BoardScope = {},
  ): Promise<RankedVolunteer[]> {
    const filter: RankedAttendanceFilter = {
      since: window.since,
      volunteerDepartments: scope.volunteerDepartments,
    };
    const rows = await this.repository.findRankedAttendance(window.now, filter);
    return rankRows(rows, rule, window.now);
  }

  /**
   * One volunteer's all-time tally under the saved rule — the profile's points
   * tile. Scores their rows alone rather than building the whole board.
   */
  async scoreVolunteer(
    userId: string,
    now = new Date(),
  ): Promise<VolunteerScore> {
    const settings = await this.getSettings();
    const rows = await this.repository.findRankedAttendance(now, { userId });
    return scoreAttendance(
      rows.map((row) => ({
        status: row.status,
        endedAt: row.event.event_ended,
        hoursRendered: row.hours_rendered,
      })),
      this.ruleOf(settings),
      now,
    );
  }

  /** The same board over the window just before this one, for the rank arrows. */
  async previousRanks(
    rule: ScoringRule,
    period: RankingPeriod,
    now: Date,
    scope: BoardScope = {},
  ): Promise<Map<string, number>> {
    const previous = previousWindow(period, now);
    if (!previous) return new Map();
    const board = await this.buildBoard(rule, previous, scope);
    return new Map(board.map((entry) => [entry.userId, entry.rank]));
  }

  /** Pesos credited for one unit of a goods type under the saved values. */
  goodsUnitValue(settings: RankingSettingsDto, goodsType: string): number {
    const values: GoodsTypeValuesDto = settings.goods_type_values;
    const known = (GOODS_TYPE_IDS as readonly string[]).includes(goodsType)
      ? values[goodsType as keyof GoodsTypeValuesDto]
      : undefined;
    return known ?? values.other ?? DEFAULT_GOODS_TYPE_VALUES.other;
  }

  /**
   * The donor standings for one window: confirmed pesos (money paid plus the
   * credited value of goods) at one point per `donor_pesos_per_point`. Ties are
   * broken by amount, then by how many donations, then by name.
   */
  async buildDonorBoard(
    pesosPerPoint: number,
    window: { since?: Date; now: Date },
  ): Promise<RankedDonor[]> {
    const rows = await this.repository.findConfirmedDonations(window.now, {
      since: window.since,
    });
    return rankDonors(rows, pesosPerPoint);
  }

  /** The donor board over the window just before this one, for the rank arrows. */
  async previousDonorRanks(
    pesosPerPoint: number,
    period: RankingPeriod,
    now: Date,
  ): Promise<Map<string, number>> {
    const previous = previousWindow(period, now);
    if (!previous) return new Map();
    const board = await this.buildDonorBoard(pesosPerPoint, previous);
    return new Map(board.map((entry) => [entry.userId, entry.rank]));
  }

  /** The tier a standing falls into: first rung whose cut-off it clears. */
  tierForRank(rank: number | null, tiers: RankingTierDto[]): RankingTierDto {
    const last = tiers[tiers.length - 1];
    if (rank === null) return last;
    return (
      tiers.find((tier) => tier.max_rank === null || rank <= tier.max_rank) ??
      last
    );
  }
}

function isPeriod(value: string): value is RankingPeriod {
  return (RANKING_PERIODS as readonly string[]).includes(value);
}

/** Where a period's window opens; undefined means all time. */
export function periodStart(
  period: RankingPeriod,
  now: Date,
): Date | undefined {
  switch (period) {
    case 'month':
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case 'quarter':
      return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    case 'year':
      return new Date(now.getFullYear(), 0, 1);
    case 'all':
      return undefined;
  }
}

/** The window of the same length that closed when this one opened. */
function previousWindow(
  period: RankingPeriod,
  now: Date,
): { since: Date; now: Date } | null {
  const start = periodStart(period, now);
  if (!start) return null;
  const months = period === 'month' ? 1 : period === 'quarter' ? 3 : 12;
  return {
    since: new Date(start.getFullYear(), start.getMonth() - months, 1),
    now: start,
  };
}

function rankRows(
  rows: RankedAttendanceRow[],
  rule: ScoringRule,
  now: Date,
): RankedVolunteer[] {
  const byUser = new Map<
    string,
    { row: RankedAttendanceRow; attendance: ScoredAttendance[] }
  >();
  for (const row of rows) {
    const bucket = byUser.get(row.user.user_id) ?? { row, attendance: [] };
    bucket.attendance.push({
      status: row.status,
      endedAt: row.event.event_ended,
      hoursRendered: row.hours_rendered,
    });
    byUser.set(row.user.user_id, bucket);
  }

  const scored = [...byUser.values()].map(({ row, attendance }) => ({
    userId: row.user.user_id,
    firstname: row.user.firstname,
    lastname: row.user.lastname,
    email: row.user.accounts[0]?.email ?? '',
    department: row.user.user_school_info[0]?.department.name ?? null,
    rank: 0,
    ...scoreAttendance(attendance, rule, now),
  }));

  scored.sort(
    (a, b) =>
      b.points - a.points ||
      b.eventsAttended - a.eventsAttended ||
      a.lastname.localeCompare(b.lastname) ||
      a.firstname.localeCompare(b.firstname),
  );
  return scored.map((entry, index) => ({ ...entry, rank: index + 1 }));
}

/** Points from pesos under the donor rule — floored, never rounded up. */
export function donorPoints(amount: number, pesosPerPoint: number): number {
  if (pesosPerPoint <= 0) return 0;
  return Math.floor(amount / pesosPerPoint);
}

function rankDonors(
  rows: ConfirmedDonationRow[],
  pesosPerPoint: number,
): RankedDonor[] {
  const byUser = new Map<string, RankedDonor>();
  for (const row of rows) {
    const entry = byUser.get(row.user.user_id) ?? {
      userId: row.user.user_id,
      name: `${row.user.firstname} ${row.user.lastname}`.trim(),
      email: row.user.accounts[0]?.email ?? '',
      rank: 0,
      points: 0,
      amount: 0,
      moneyAmount: 0,
      goodsAmount: 0,
      donations: 0,
      lastDonatedAt: null,
    };
    entry.amount += row.amount;
    if (row.kind === 'MONEY') entry.moneyAmount += row.amount;
    else entry.goodsAmount += row.amount;
    entry.donations += 1;
    if (
      row.confirmed_at &&
      (!entry.lastDonatedAt || row.confirmed_at > entry.lastDonatedAt)
    ) {
      entry.lastDonatedAt = row.confirmed_at;
    }
    byUser.set(entry.userId, entry);
  }

  const scored = [...byUser.values()].map((entry) => ({
    ...entry,
    points: donorPoints(entry.amount, pesosPerPoint),
  }));
  scored.sort(
    (a, b) =>
      b.points - a.points ||
      b.amount - a.amount ||
      b.donations - a.donations ||
      a.name.localeCompare(b.name),
  );
  return scored.map((entry, index) => ({ ...entry, rank: index + 1 }));
}
