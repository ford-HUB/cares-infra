import { z } from 'zod';
import { GOODS_TYPE_IDS } from '../../../shared/constants/goods-types';

/** How far back the standings are counted. */
export const RANKING_PERIODS = ['month', 'quarter', 'year', 'all'] as const;
export const RankingPeriodSchema = z.enum(RANKING_PERIODS);

/**
 * The frame gallery the portal's Customization page offers. Kept in step with
 * `site/src/constants/rank-frames.ts` and the app's `rank_frame_design.dart`.
 */
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

/**
 * One rung of the ladder. `max_rank` is the highest standing still in the tier;
 * null marks the catch-all last tier that takes everyone below the rest.
 */
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

/** Pesos credited per unit of each goods type — one entry per catalogued type. */
export const GoodsTypeValuesSchema = z.partialRecord(
  z.enum(GOODS_TYPE_IDS),
  z.number().int().min(0).max(GOODS_TYPE_VALUE_MAX),
);

/** The whole scoring rule and ladder, as stored and as the portal edits it. */
export const RankingSettingsResponseSchema = z.object({
  points_per_attendance: z.number().int(),
  absence_penalty_step: z.number().int(),
  absence_reset_days: z.number().int(),
  /** Donor board: one point per this many pesos of confirmed donations. */
  donor_pesos_per_point: z.number().int(),
  goods_type_values: GoodsTypeValuesSchema,
  default_period: RankingPeriodSchema,
  /** Highest tier first; the last one is the catch-all and has no cut-off. */
  tiers: z.array(RankingTierSchema),
  updated_at: z.string(),
});

export const UpdateRankingSettingsSchema = z
  .object({
    points_per_attendance: z.number().int().min(1).max(500),
    absence_penalty_step: z.number().int().min(0).max(100),
    absence_reset_days: z.number().int().min(1).max(90),
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

/** One volunteer's standing with the figures that produced it. */
export const VolunteerRankingEntrySchema = z.object({
  user_id: z.string(),
  firstname: z.string(),
  lastname: z.string(),
  email: z.string(),
  department: z.string().nullable(),
  rank: z.number().int(),
  /** Standing in the previous period; null for a first-time entrant. */
  previous_rank: z.number().int().nullable(),
  points: z.number().int(),
  points_earned: z.number().int(),
  points_deducted: z.number().int(),
  events_attended: z.number().int(),
  events_missed: z.number().int(),
  /** Credited service hours, kept for the table — points never come from them. */
  hours: z.number(),
  /** Straight misses still counting against the next one; 0 once a week has passed. */
  current_streak: z.number().int(),
  last_active_at: z.string().nullable(),
});

export const VolunteerRankingsResponseSchema = z.object({
  period: RankingPeriodSchema,
  /** The college the board is cut to; null for the whole school. */
  department: z.string().nullable(),
  entries: z.array(VolunteerRankingEntrySchema),
});

/** Cumulative points of the top three at each recent month end. */
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

/** One donor's standing with the figures that produced it. */
export const DonorRankingEntrySchema = z.object({
  user_id: z.string(),
  name: z.string(),
  email: z.string(),
  rank: z.number().int(),
  /** Standing in the previous period; null for a first-time entrant. */
  previous_rank: z.number().int().nullable(),
  points: z.number().int(),
  /** Confirmed pesos in the period — money paid plus the credited value of goods. */
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
