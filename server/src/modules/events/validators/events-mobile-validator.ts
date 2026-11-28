import { z } from 'zod';
import {
  AttendanceStatus,
  EventParticipationRole,
  EventRoleApproval,
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
  /** 0–1 from nlp-service; shown as a tag, not a number. */
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
  /** Attendance row count, not a cached figure. */
  participants: z.number(),
  /** Floored at zero. */
  slots_left: z.number().int().min(0),
  is_registered: z.boolean(),
  /** PENDING until judged, then COMPLETED or ABSENT. Null when not registered. */
  attendance_status: z.enum(AttendanceStatus).nullable(),
  /** Null when not registered. */
  participation_role: z.enum(EventParticipationRole).nullable(),
  /** APPROVED for Regular; PENDING under review; REJECTED keeps them as Regular. Null when not registered. */
  role_approval: z.enum(EventRoleApproval).nullable(),
  organizer_name: z.string(),
  category: z.string(),
  status: z.enum(EventStatus),
  beneficiary_applicable: z.boolean(),
  /** What a donor may give. */
  funds_donation: z.boolean(),
  goods_donation: z.boolean(),
  goods_types: z.array(z.string()),
  /** Pledged or better, whole pesos. */
  funds_raised: z.number().int().min(0),
  /** Excludes cancelled and declined. */
  donations_count: z.number().int().min(0),
  /** ACCEPTED also flips `is_registered`; REJECTED may reapply. Null for volunteers and unapplied events. */
  application_status: z.enum(['PENDING', 'ACCEPTED', 'REJECTED']).nullable(),
  /** REJECTED only. */
  application_rejection_reason: z.string().nullable(),
  marker_lat: z.number().nullable(),
  marker_lng: z.number().nullable(),
  /** `[lng, lat]` rings (holes and parts flattened); the app uses even-odd, like gps-validator-service. Null when none. */
  geofence: z.array(z.array(z.tuple([z.number(), z.number()]))).nullable(),
  /** Each streams from `GET /events/:id/images/:index`. */
  image_count: z.number().int().min(0),
  /** Best first. */
  matched_interests: z.array(MatchedInterestSchema),
  /** Max over matched_interests; the sort key. */
  match_score: z.number(),
});

export const RecommendedEventsResponseSchema = z.object({
  /** False prompts the app to ask for interests. */
  has_interests: z.boolean(),
  events: z.array(RecommendedEventSchema),
});

export const DonationEventsResponseSchema = z.object({
  events: z.array(RecommendedEventSchema),
});

/** Past and upcoming; no interest matching. */
export const RegisteredEventsResponseSchema = z.object({
  events: z.array(RecommendedEventSchema),
});

/** Role defaults to REGULAR, so an empty body (older builds) still works. */
export const RegisterForEventBodySchema = z
  .object({
    participation_role: z
      .enum(EventParticipationRole)
      .default(EventParticipationRole.REGULAR),
  })
  .strict()
  .default({ participation_role: EventParticipationRole.REGULAR });

export const EventParticipantSchema = z.object({
  name: z.string(),
  /** Badges the caller's row without user ids. */
  is_me: z.boolean(),
  participation_role: z.enum(EventParticipationRole),
  role_approval: z.enum(EventRoleApproval),
  attendance_status: z.enum(AttendanceStatus),
});

export const EventParticipantsResponseSchema = z.object({
  event_id: z.number(),
  participants: z.array(EventParticipantSchema),
});

export const EventRegistrationResponseSchema = z.object({
  event_id: z.number(),
  is_registered: z.boolean(),
  /** Null once cancelled. */
  participation_role: z.enum(EventParticipationRole).nullable(),
  role_approval: z.enum(EventRoleApproval).nullable(),
  max_participants: z.number(),
  participants: z.number(),
  slots_left: z.number().int().min(0),
});
