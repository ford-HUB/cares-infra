import { z } from 'zod';
import {
  EventStatus,
  InterestCode,
} from '../../../infastructures/prisma/common/client';

export const RECOMMENDED_EVENTS_DEFAULT_LIMIT = 10;
export const RECOMMENDED_EVENTS_MAX_LIMIT = 50;

export const RecommendedEventsQuerySchema = z
  .object({
    limit: z
      .union([z.string(), z.number()])
      .optional()
      .transform((v) => {
        if (v === undefined || v === '')
          return RECOMMENDED_EVENTS_DEFAULT_LIMIT;
        return typeof v === 'string' ? Number(v) : v;
      })
      .pipe(z.number().int().min(1).max(RECOMMENDED_EVENTS_MAX_LIMIT)),
  })
  .strict();

export const MatchedInterestSchema = z.object({
  code: z.enum(InterestCode),
  label: z.string(),
  /** Blended 0–1 confidence from nlp-service; the volunteer sees it as a tag, not a number. */
  score: z.number(),
});

export const RecommendedEventSchema = z.object({
  event_id: z.number(),
  title: z.string(),
  description: z.string(),
  event_started: z.string(),
  event_ended: z.string(),
  location: z.string(),
  max_participants: z.number(),
  participants: z.number(),
  organizer_name: z.string(),
  category: z.string(),
  status: z.enum(EventStatus),
  beneficiary_applicable: z.boolean(),
  marker_lat: z.number().nullable(),
  marker_lng: z.number().nullable(),
  /** True when the event carries at least one image; the bytes come from the image route. */
  has_image: z.boolean(),
  /** Interests the volunteer selected that this event was tagged with, best first. */
  matched_interests: z.array(MatchedInterestSchema),
  /** Highest score across matched_interests — what the list is ordered by. */
  match_score: z.number(),
});

export const RecommendedEventsResponseSchema = z.object({
  /** False when the volunteer has not picked interests yet, so the app can prompt. */
  has_interests: z.boolean(),
  events: z.array(RecommendedEventSchema),
});
