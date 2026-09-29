import { z } from 'zod';
import {
  AttendanceStatus,
  GeoValidationMethod,
} from '../../../infastructures/prisma/common/client';

export const AttendeeEventIdQuerySchema = z
  .union([z.string(), z.number()])
  .optional()
  .transform((value) => {
    if (value === undefined || value === '' || value === null) return undefined;
    const parsed = typeof value === 'string' ? Number(value) : value;
    return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
  });

export const EventAttendeeQuerySchema = z
  .object({
    event_id: AttendeeEventIdQuerySchema,
  })
  .strict();

/**
 * The portal renders one flat roster and groups it client-side, so every row carries
 * its own event identity rather than being nested under one.
 */
export const EventAttendeeResponseSchema = z.object({
  event_attendance_id: z.string(),
  event_id: z.number(),
  event_title: z.string(),
  event_started: z.string(),
  /** The college the event was run for; null for non-School events. */
  event_department: z.string().nullable(),
  user_id: z.string(),
  firstname: z.string(),
  lastname: z.string(),
  email: z.string(),
  phone_number: z.string().nullable(),
  department: z.string().nullable(),
  year_level: z.string().nullable(),
  status: z.enum(AttendanceStatus),
  validation_method: z.enum(GeoValidationMethod).nullable(),
  first_ping_at: z.string().nullable(),
  last_ping_at: z.string().nullable(),
  hours_rendered: z.number().nullable(),
  remarks: z.string().nullable(),
  registered_at: z.string(),
});

export const EventAttendeeListResponseSchema = z.array(
  EventAttendeeResponseSchema,
);

/**
 * What the geofence is seeing for one volunteer right now. Not `AttendanceStatus`:
 * that is the post-event ruling and stays PENDING for everyone while the event runs.
 */
export const LiveAttendanceStateSchema = z.enum([
  'in_area',
  'outside_area',
  'awaiting_sync',
]);

export const LiveEventSessionSchema = z.object({
  event_id: z.number(),
  title: z.string(),
  location: z.string(),
  started_at: z.string(),
  ended_at: z.string(),
  /** Equivalent-circle radius of the drawn fence, in metres; null when no fence. */
  radius_meters: z.number().nullable(),
  coordinator: z.string(),
});

export const LiveAttendeeResponseSchema = z.object({
  event_attendance_id: z.string(),
  user_id: z.string(),
  firstname: z.string(),
  lastname: z.string(),
  email: z.string(),
  phone_number: z.string().nullable(),
  department: z.string().nullable(),
  year_level: z.string().nullable(),
  state: LiveAttendanceStateSchema,
  status: z.enum(AttendanceStatus),
  validation_method: z.enum(GeoValidationMethod).nullable(),
  first_ping_at: z.string().nullable(),
  last_ping_at: z.string().nullable(),
  /** Metres from the fence at the last reading; 0 when inside. */
  distance_meters: z.number().nullable(),
  /** Share (0–1) of the event so far the readings place inside the fence. */
  inside_ratio: z.number().nullable(),
  remarks: z.string().nullable(),
});

export const LiveAttendanceSnapshotSchema = z.object({
  /** Null when no event is running right now. */
  session: LiveEventSessionSchema.nullable(),
  attendees: z.array(LiveAttendeeResponseSchema),
  captured_at: z.string(),
});
