import { z } from 'zod';
import { GOODS_TYPE_IDS } from '../../../shared/constants/goods-types';
import { SPECIAL_PARTICIPATION_ROLES } from '../../../shared/constants/participation-role-points';

export const RANKING_PERIODS = ['month', 'quarter', 'year', 'all'] as const;
export const RankingPeriodSchema = z.enum(RANKING_PERIODS);

/** Must match `site/src/constants/rank-frames.ts` and the app's `rank_frame_design.dart`. */
export const RANK_FRAME_DESIGNS = [
  'aurora',
  'laurel',
  'shield',
  'orbit',
  'crown',
  'starburst',
  'blossom',
  'gear',
  'flame',
  'prism',
  'halo',
  'ring',
] as const;

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export const RANKING_TIER_LABEL_MAX = 24;
export const RANKING_TIER_MIN_COUNT = 2;
export const RANKING_TIER_MAX_COUNT = 8;

/** `max_rank` is the tier's lowest standing; null marks the catch-all last tier. */
export const RankingTierSchema = z
  .object({
    id: z.string().trim().min(1),
    label: z.string().trim().min(1).max(RANKING_TIER_LABEL_MAX),
    max_rank: z.number().int().min(1).nullable(),
    frame: z.enum(RANK_FRAME_DESIGNS),
    color_from: z
      .string()
      .trim()
      .regex(HEX_COLOR, 'Colour must be six-digit hex'),
    color_to: z
      .string()
      .trim()
      .regex(HEX_COLOR, 'Colour must be six-digit hex'),
  })
  .strict();

export const DONOR_PESOS_PER_POINT_MIN = 1;
export const DONOR_PESOS_PER_POINT_MAX = 100_000;
export const GOODS_TYPE_VALUE_MAX = 1_000_000;

/** Pesos per unit, per goods type. */
export const GoodsTypeValuesSchema = z.partialRecord(
  z.enum(GOODS_TYPE_IDS),
  z.number().int().min(0).max(GOODS_TYPE_VALUE_MAX),
);

export const PARTICIPATION_ROLE_POINTS_MAX = 500;

export const ParticipationRolePointsSchema = z.partialRecord(
  z.enum(SPECIAL_PARTICIPATION_ROLES),
  z.number().int().min(0).max(PARTICIPATION_ROLE_POINTS_MAX),
);

export const RankingSettingsResponseSchema = z.object({
  points_per_attendance: z.number().int(),
  absence_penalty_step: z.number().int(),
  absence_reset_days: z.number().int(),
  /** Bonus for approved Organizer/Facilitator/Speaker. */
  participation_role_points: ParticipationRolePointsSchema,
  /** One point per this many confirmed pesos. */
  donor_pesos_per_point: z.number().int(),
  goods_type_values: GoodsTypeValuesSchema,
  default_period: RankingPeriodSchema,
  /** Highest first; the last is the catch-all. */
  tiers: z.array(RankingTierSchema),
  updated_at: z.string(),
});

export const UpdateRankingSettingsSchema = z
  .object({
    points_per_attendance: z.number().int().min(1).max(500),
    absence_penalty_step: z.number().int().min(0).max(100),
    absence_reset_days: z.number().int().min(1).max(90),
    participation_role_points: ParticipationRolePointsSchema,
    donor_pesos_per_point: z
      .number()
      .int()
      .min(DONOR_PESOS_PER_POINT_MIN)
      .max(DONOR_PESOS_PER_POINT_MAX),
    goods_type_values: GoodsTypeValuesSchema,
    default_period: RankingPeriodSchema,
    tiers: z
      .array(RankingTierSchema)
      .min(RANKING_TIER_MIN_COUNT)
      .max(RANKING_TIER_MAX_COUNT),
  })
  .strict()
  .refine(
    ({ tiers }) =>
      tiers.every((tier, index) =>
        index === tiers.length - 1
          ? tier.max_rank === null
          : tier.max_rank !== null &&
            (index === 0 || tier.max_rank > (tiers[index - 1].max_rank ?? 0)),
      ),
    {
      path: ['tiers'],
      message:
        'Tier cut-offs must ascend, and only the last tier may be the catch-all',
    },
  );

export const RankingsQuerySchema = z
  .object({
    period: RankingPeriodSchema.optional(),
  })
  .strict();

export const VolunteerRankingEntrySchema = z.object({
  user_id: z.string(),
  firstname: z.string(),
  lastname: z.string(),
  email: z.string(),
  department: z.string().nullable(),
  rank: z.number().int(),
  /** Null for first-time entrants. */
  previous_rank: z.number().int().nullable(),
  points: z.number().int(),
  points_earned: z.number().int(),
  /** Portion of `points_earned` from approved roles. */
  role_points: z.number().int(),
  role_counts: z.object({
    ORGANIZER: z.number().int(),
    FACILITATOR: z.number().int(),
    SPEAKER: z.number().int(),
  }),
  points_deducted: z.number().int(),
  events_attended: z.number().int(),
  events_missed: z.number().int(),
  /** Display only; points never come from hours. */
  hours: z.number(),
  /** 0 once a week has passed. */
  current_streak: z.number().int(),
  last_active_at: z.string().nullable(),
});

export const VolunteerRankingsResponseSchema = z.object({
  period: RankingPeriodSchema,
  /** Null for the whole school. */
  department: z.string().nullable(),
  entries: z.array(VolunteerRankingEntrySchema),
});

export const RankingTrendResponseSchema = z.object({
  labels: z.array(z.string()),
  series: z.array(
    z.object({
      user_id: z.string(),
      name: z.string(),
      rank: z.number().int(),
      values: z.array(z.number().int()),
    }),
  ),
});

export const DonorRankingEntrySchema = z.object({
  user_id: z.string(),
  name: z.string(),
  email: z.string(),
  rank: z.number().int(),
  /** Null for first-time entrants. */
  previous_rank: z.number().int().nullable(),
  points: z.number().int(),
  /** Money plus credited goods value. */
  amount: z.number().int(),
  money_amount: z.number().int(),
  goods_amount: z.number().int(),
  donations: z.number().int(),
  last_donated_at: z.string().nullable(),
});

export const DonorRankingsResponseSchema = z.object({
  period: RankingPeriodSchema,
  donor_pesos_per_point: z.number().int(),
  entries: z.array(DonorRankingEntrySchema),
});

const DepartmentRanksSchema = z.object({
  /** Ranked on `score`. */
  overall: z.number().int(),
  hours: z.number().int(),
  donations: z.number().int(),
});

export const DepartmentRankingEntrySchema = z.object({
  /** College code when known, else the lowercased name. */
  key: z.string(),
  name: z.string(),
  /** e.g. `CCS`. */
  code: z.string().nullable(),
  volunteers: z.number().int(),
  events_attended: z.number().int(),
  hours: z.number(),
  /** Money plus goods value. */
  donation_amount: z.number().int(),
  donations: z.number().int(),
  /** 0–100: half share of hours, half share of pesos. */
  score: z.number(),
  ranks: DepartmentRanksSchema,
  /** Null for all time. */
  previous_ranks: DepartmentRanksSchema.nullable(),
});

export const DepartmentRankingsResponseSchema = z.object({
  period: RankingPeriodSchema,
  entries: z.array(DepartmentRankingEntrySchema),
  /** Volunteers without a school record, and school-wide event donations. */
  unattributed: z.object({
    hours: z.number(),
    donation_amount: z.number().int(),
  }),
});
