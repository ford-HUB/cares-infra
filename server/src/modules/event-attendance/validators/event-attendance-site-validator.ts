import { z } from 'zod';
import {
  AttendanceStatus,
  GeoValidationMethod,
} from '../../../infastructures/prisma/common/client';
import { CONTROL_CHARACTER_PATTERN } from '../../../shared/validators/control-character-validator';
import { withoutPrototypeKeys } from '../../../shared/validators/prototype-key-validator';

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

/** Flat: the portal groups client-side. */
export const EventAttendeeResponseSchema = z.object({
  event_attendance_id: z.string(),
  event_id: z.number(),
  event_title: z.string(),
  event_started: z.string(),
  event_ended: z.string(),
  /** Null for non-School events. */
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
  /** First in-zone reading. */
  first_ping_at: z.string().nullable(),
  /** Latest in-zone reading, settled or not. */
  last_ping_at: z.string().nullable(),
  /** Null while inside or on a mid-event break under the departure buffer. */
  time_out_at: z.string().nullable(),
  hours_rendered: z.number().nullable(),
  remarks: z.string().nullable(),
  registered_at: z.string(),
});

export const EventAttendeeListResponseSchema = z.array(
  EventAttendeeResponseSchema,
);

export const MANUAL_ATTENDANCE_MAX_ROWS = 500;
export const MANUAL_ATTENDANCE_REASON_MAX = 300;

/** Optional reason goes to remarks and the audit trail. */
export const ManualAttendanceSchema = withoutPrototypeKeys(
  z
    .object({
      event_attendance_ids: z
        .array(z.string().uuid())
        .min(1, 'Select at least one participant')
        .max(MANUAL_ATTENDANCE_MAX_ROWS)
        .transform((ids) => [...new Set(ids)]),
      reason: z
        .string()
        .trim()
        .max(MANUAL_ATTENDANCE_REASON_MAX)
        .refine((value) => !CONTROL_CHARACTER_PATTERN.test(value), {
          message: 'Reason cannot contain control characters',
        })
        .optional()
        .transform((value) => (value ? value : undefined)),
    })
    .strict(),
);

export const ManualAttendanceResponseSchema = z.object({
  marked: EventAttendeeListResponseSchema,
  already_completed: z.number(),
});

/** Not `AttendanceStatus`, which stays PENDING until the post-event ruling. */
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
  /** Equivalent-circle radius; null when no fence. */
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
  /** Null while inside or on a break under the buffer. */
  time_out_at: z.string().nullable(),
  /** 0 when inside. */
  distance_meters: z.number().nullable(),
  /** Share (0–1) of the event so far. */
  inside_ratio: z.number().nullable(),
  remarks: z.string().nullable(),
});

export const LiveAttendanceSnapshotSchema = z.object({
  session: LiveEventSessionSchema.nullable(),
  attendees: z.array(LiveAttendeeResponseSchema),
  captured_at: z.string(),
});
