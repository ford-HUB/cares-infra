import { z } from 'zod';
import {
  DonationEventsResponseSchema,
  EventParticipantSchema,
  EventParticipantsResponseSchema,
  EventRegistrationResponseSchema,
  MatchedInterestSchema,
  RecommendedEventSchema,
  RecommendedEventsQuerySchema,
  RecommendedEventsResponseSchema,
  RegisterForEventBodySchema,
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
export type EventParticipantDto = z.infer<typeof EventParticipantSchema>;
export type EventParticipantsResponseDto = z.infer<
  typeof EventParticipantsResponseSchema
>;
export type DonationEventsResponseDto = z.infer<
  typeof DonationEventsResponseSchema
>;
export type RegisterForEventBodyDto = z.infer<
  typeof RegisterForEventBodySchema
>;
