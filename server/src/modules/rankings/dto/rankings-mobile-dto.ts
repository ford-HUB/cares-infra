import { z } from 'zod';
import {
  LeaderboardEntrySchema,
  LeaderboardMeSchema,
  LeaderboardQuerySchema,
  LeaderboardResponseSchema,
} from '../validators/rankings-mobile-validator';

export type LeaderboardQueryDto = z.infer<typeof LeaderboardQuerySchema>;
export type LeaderboardEntryDto = z.infer<typeof LeaderboardEntrySchema>;
export type LeaderboardMeDto = z.infer<typeof LeaderboardMeSchema>;
export type LeaderboardResponseDto = z.infer<typeof LeaderboardResponseSchema>;
