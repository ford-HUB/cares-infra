import { z } from 'zod';
import {
  EventRegistrationResponseSchema,
  MatchedInterestSchema,
  RecommendedEventSchema,
  RecommendedEventsQuerySchema,
  RecommendedEventsResponseSchema,
  RegisteredEventsResponseSchema,
} from '../validators/events-mobile-validator';

export type RecommendedEventsQueryDto = z.infer<
  typeof RecommendedEventsQuerySchema
>;
export type MatchedInterestDto = z.infer<typeof MatchedInterestSchema>;
export type RecommendedEventDto = z.infer<typeof RecommendedEventSchema>;
export type RecommendedEventsResponseDto = z.infer<
  typeof RecommendedEventsResponseSchema
>;
export type RegisteredEventsResponseDto = z.infer<
  typeof RegisteredEventsResponseSchema
>;
export type EventRegistrationResponseDto = z.infer<
  typeof EventRegistrationResponseSchema
>;
