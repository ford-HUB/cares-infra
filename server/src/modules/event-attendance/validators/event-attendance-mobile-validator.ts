import { z } from 'zod';

/**
 * The device's best-guess event for a reading. It sends its local id as a string and
 * `unassigned` when it could not name one; anything that is not a positive integer is
 * stored as a null hint rather than rejected, because the validation service re-assigns
 * rows from coordinates anyway.
 */
export const PingEventIdSchema = z.string().trim().min(1);

/** One live reading, sent every second while the volunteer is online. */
export const LiveCoordinateSchema = z
  .object({
    eventId: PingEventIdSchema,
    capturedAt: z.iso.datetime({ offset: true }),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    accuracyMeters: z.number().min(0),
    inArea: z.boolean(),
  })
  .strict();

export const LiveCoordinateResponseSchema = z.object({
  accepted: z.number().int(),
});

/**
 * Multipart fields that ride alongside the CSV. They arrive as strings, so they are
 * coerced here; the CSV itself is parsed in the service.
 */
export const SyncCoordinatesFieldsSchema = z
  .object({
    eventId: PingEventIdSchema,
    capturedFrom: z.iso.datetime({ offset: true }),
    capturedTo: z.iso.datetime({ offset: true }),
    rowCount: z.coerce.number().int().min(1),
  })
  .strict();

export const SyncCoordinatesResponseSchema = z.object({
  accepted: z.number().int(),
  /** Lines the server could not read; the device keeps nothing for these. */
  skipped: z.number().int(),
});

/** Columns of the CSV the device uploads, in order. */
export const SYNC_CSV_HEADER = 'time,latitude,longitude,accuracy_m,in_area';
