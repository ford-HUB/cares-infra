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
