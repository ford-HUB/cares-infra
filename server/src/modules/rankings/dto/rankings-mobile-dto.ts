import { z } from 'zod';
import {
  DonorLeaderboardEntrySchema,
  DonorLeaderboardMeSchema,
  DonorLeaderboardResponseSchema,
  LeaderboardEntrySchema,
  LeaderboardMeSchema,
  LeaderboardQuerySchema,
  LeaderboardResponseSchema,
} from '../validators/rankings-mobile-validator';

export type LeaderboardQueryDto = z.infer<typeof LeaderboardQuerySchema>;
export type LeaderboardEntryDto = z.infer<typeof LeaderboardEntrySchema>;
export type LeaderboardMeDto = z.infer<typeof LeaderboardMeSchema>;
export type LeaderboardResponseDto = z.infer<typeof LeaderboardResponseSchema>;
export type DonorLeaderboardEntryDto = z.infer<
  typeof DonorLeaderboardEntrySchema
>;
export type DonorLeaderboardMeDto = z.infer<typeof DonorLeaderboardMeSchema>;
export type DonorLeaderboardResponseDto = z.infer<
  typeof DonorLeaderboardResponseSchema
>;
