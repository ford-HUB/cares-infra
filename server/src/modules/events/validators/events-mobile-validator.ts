import { z } from 'zod';
import {
  AttendanceStatus,
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
  /** Volunteers with an attendance row — the real registration count, not a cached figure. */
  participants: z.number(),
  /** `max_participants - participants`, floored at zero. */
  slots_left: z.number().int().min(0),
  /** Whether the caller already holds one of those slots. */
  is_registered: z.boolean(),
  /**
   * The geofence ruling on the caller's own attendance — PENDING until the
   * event is judged, then COMPLETED or ABSENT. Null when not registered.
   */
  attendance_status: z.enum(AttendanceStatus).nullable(),
  organizer_name: z.string(),
  category: z.string(),
  status: z.enum(EventStatus),
  beneficiary_applicable: z.boolean(),
  /** The director's "Accepted Donations" panel — what a donor may give. */
  funds_donation: z.boolean(),
  goods_donation: z.boolean(),
  goods_types: z.array(z.string()),
  /** Money paid towards this event so far (pledged or better), whole pesos. */
  funds_raised: z.number().int().min(0),
  /** Money and goods donations opened on this event, cancelled and declined excluded. */
  donations_count: z.number().int().min(0),
  /**
   * A beneficiary's own application for this event: PENDING while a director
   * has yet to rule, ACCEPTED once they have (which is also when
   * `is_registered` flips). Null for volunteers and unapplied events.
   */
  application_status: z.enum(['PENDING', 'ACCEPTED']).nullable(),
  marker_lat: z.number().nullable(),
  marker_lng: z.number().nullable(),
  /** How many images the event carries; each streams from `GET /events/:id/images/:index`. */
  image_count: z.number().int().min(0),
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

/** Open events accepting donations — the donor app's campaign feed. */
export const DonationEventsResponseSchema = z.object({
  events: z.array(RecommendedEventSchema),
});

/** The volunteer's own registrations, past and upcoming. No interest matching. */
export const RegisteredEventsResponseSchema = z.object({
  events: z.array(RecommendedEventSchema),
});

export const EventRegistrationResponseSchema = z.object({
  event_id: z.number(),
  is_registered: z.boolean(),
  max_participants: z.number(),
  participants: z.number(),
  slots_left: z.number().int().min(0),
});
