import { z } from 'zod';

/** Non-positive-integer ids (e.g. `unassigned`) stored as null, not rejected: the service re-assigns by coordinates. */
export const PingEventIdSchema = z.string().trim().min(1);

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

/** Multipart strings, coerced here; the CSV is parsed in the service. */
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
  /** Unreadable lines; the device keeps nothing for these. */
  skipped: z.number().int(),
});

export const SYNC_CSV_HEADER = 'time,latitude,longitude,accuracy_m,in_area';
