import { z } from 'zod';
import {
  MatchedInterestSchema,
  RecommendedEventSchema,
  RecommendedEventsQuerySchema,
  RecommendedEventsResponseSchema,
} from '../validators/events-mobile-validator';

export type RecommendedEventsQueryDto = z.infer<
  typeof RecommendedEventsQuerySchema
>;
export type MatchedInterestDto = z.infer<typeof MatchedInterestSchema>;
export type RecommendedEventDto = z.infer<typeof RecommendedEventSchema>;
export type RecommendedEventsResponseDto = z.infer<
  typeof RecommendedEventsResponseSchema
>;
