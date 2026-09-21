import { z } from 'zod';
import {
  RankingPeriodSchema,
  RankingTierSchema,
} from './rankings-site-validator';

export const LeaderboardQuerySchema = z
  .object({
    period: RankingPeriodSchema.optional(),
  })
  .strict();

/** A row of the app's leaderboard — enough to draw the card, nothing personal. */
export const LeaderboardEntrySchema = z.object({
  user_id: z.string(),
  display_name: z.string(),
  department: z.string().nullable(),
  rank: z.number().int(),
  points: z.number().int(),
  events_attended: z.number().int(),
  /** Which rung the standing falls into — the frame the avatar wears. */
  tier_id: z.string(),
  is_me: z.boolean(),
});

/** The caller's own standing, present even when they sit outside the top list. */
export const LeaderboardMeSchema = z.object({
  rank: z.number().int().nullable(),
  points: z.number().int(),
  points_earned: z.number().int(),
  points_deducted: z.number().int(),
  events_attended: z.number().int(),
  events_missed: z.number().int(),
  current_streak: z.number().int(),
  /** What the next straight miss would cost, given the streak so far. */
  next_absence_penalty: z.number().int(),
  tier_id: z.string(),
});

export const LeaderboardResponseSchema = z.object({
  period: RankingPeriodSchema,
  points_per_attendance: z.number().int(),
  absence_penalty_step: z.number().int(),
  absence_reset_days: z.number().int(),
  tiers: z.array(RankingTierSchema),
  total_ranked: z.number().int(),
  entries: z.array(LeaderboardEntrySchema),
  me: LeaderboardMeSchema,
});

/** A row of the donor app's leaderboard. */
export const DonorLeaderboardEntrySchema = z.object({
  user_id: z.string(),
  display_name: z.string(),
  rank: z.number().int(),
  points: z.number().int(),
  /** Confirmed pesos in the period — money paid plus the credited value of goods. */
  amount: z.number().int(),
  donations: z.number().int(),
  tier_id: z.string(),
  is_me: z.boolean(),
});

export const DonorLeaderboardMeSchema = z.object({
  rank: z.number().int().nullable(),
  points: z.number().int(),
  amount: z.number().int(),
  money_amount: z.number().int(),
  goods_amount: z.number().int(),
  donations: z.number().int(),
  tier_id: z.string(),
});

export const DonorLeaderboardResponseSchema = z.object({
  period: RankingPeriodSchema,
  donor_pesos_per_point: z.number().int(),
  tiers: z.array(RankingTierSchema),
  total_ranked: z.number().int(),
  entries: z.array(DonorLeaderboardEntrySchema),
  me: DonorLeaderboardMeSchema,
});
