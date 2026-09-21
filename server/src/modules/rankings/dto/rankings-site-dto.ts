import { z } from 'zod';
import {
  DonorRankingEntrySchema,
  DonorRankingsResponseSchema,
  GoodsTypeValuesSchema,
  RankingPeriodSchema,
  RankingSettingsResponseSchema,
  RankingTierSchema,
  RankingTrendResponseSchema,
  RankingsQuerySchema,
  UpdateRankingSettingsSchema,
  VolunteerRankingEntrySchema,
  VolunteerRankingsResponseSchema,
} from '../validators/rankings-site-validator';

export type RankingPeriod = z.infer<typeof RankingPeriodSchema>;
export type RankingTierDto = z.infer<typeof RankingTierSchema>;
export type RankingSettingsDto = z.infer<typeof RankingSettingsResponseSchema>;
export type UpdateRankingSettingsDto = z.infer<
  typeof UpdateRankingSettingsSchema
>;
export type RankingsQueryDto = z.infer<typeof RankingsQuerySchema>;
export type VolunteerRankingEntryDto = z.infer<
  typeof VolunteerRankingEntrySchema
>;
export type VolunteerRankingsResponseDto = z.infer<
  typeof VolunteerRankingsResponseSchema
>;
export type RankingTrendResponseDto = z.infer<
  typeof RankingTrendResponseSchema
>;
export type GoodsTypeValuesDto = z.infer<typeof GoodsTypeValuesSchema>;
export type DonorRankingEntryDto = z.infer<typeof DonorRankingEntrySchema>;
export type DonorRankingsResponseDto = z.infer<
  typeof DonorRankingsResponseSchema
>;
