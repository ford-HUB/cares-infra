import { z } from 'zod';
import { EventStatus } from '../../../infastructures/prisma/common/client';

export const EVENT_MAX_IMAGE_COUNT = 3;
export const EVENT_MAX_IMAGE_BYTES = 3 * 1024 * 1024;
export const EVENT_ALLOWED_IMAGE_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

/** Multipart bodies deliver everything as strings, so booleans/numbers/JSON are coerced. */
const booleanFromString = z
  .union([z.boolean(), z.string()])
  .transform((v) => v === true || v === 'true' || v === '1');

const optionalNumberFromString = z
  .union([z.string(), z.number()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === '' || v === null) return undefined;
    const n = typeof v === 'string' ? Number(v) : v;
    return Number.isFinite(n) ? n : undefined;
  });

const stringArrayFromAny = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((v) => {
    if (v === undefined) return [] as string[];
    return Array.isArray(v) ? v : [v];
  });

const geojsonFromString = z
  .union([z.string(), z.record(z.string(), z.unknown()), z.null()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === null || v === '') return null;
    if (typeof v === 'string') {
      try {
        return JSON.parse(v) as unknown;
      } catch {
        return null;
      }
    }
    return v;
  });

export const CreateEventSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, 'Event title must be at least 3 characters')
      .max(255),
    description: z
      .string()
      .trim()
      .min(10, 'Description must be at least 10 characters')
      .max(2000),
    event_started: z.string().min(1, 'Start date and time is required'),
    event_ended: z.string().min(1, 'End date and time is required'),
    location: z
      .string()
      .trim()
      .min(3, 'Location must be at least 3 characters')
      .max(255),
    max_participants: z
      .union([z.string(), z.number()])
      .transform((v) => (typeof v === 'string' ? Number(v) : v))
      .pipe(z.number().int().min(1).max(10000)),
    organizer_name: z.string().trim().min(2).max(255),
    category: z.string().trim().min(1, 'Category is required').max(120),
    department: z.string().trim().max(200).optional(),
    specified_category: z.string().trim().max(200).optional(),
    beneficiary_applicable: booleanFromString.default(false),
    max_beneficiaries: optionalNumberFromString,
    funds_donation: booleanFromString.default(false),
    goods_donation: booleanFromString.default(false),
    goods_types: stringArrayFromAny,
    event_images_existing: stringArrayFromAny,
    geojson: geojsonFromString,
    area_sqm: optionalNumberFromString,
  })
  .refine((data) => new Date(data.event_ended) > new Date(data.event_started), {
    message: 'End must be after start',
    path: ['event_ended'],
  });

export const UpdateEventSchema = CreateEventSchema;

export const UpdateDonationsSchema = z
  .object({
    funds: z.boolean(),
    goods: z.boolean(),
    goodsTypes: z.array(z.string()).default([]),
  })
  .strict();

export const EventIdParamSchema = z
  .union([z.string(), z.number()])
  .transform((v) => (typeof v === 'string' ? Number(v) : v))
  .pipe(z.number().int().positive());

export const EventResponseSchema = z.object({
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
  department: z.string().optional(),
  specified_category: z.string().optional(),
  event_image: z.string().optional(),
  event_images: z.array(z.string()),
  status: z.enum(EventStatus),
  funds_donation: z.boolean(),
  goods_donation: z.boolean(),
  goods_types: z.array(z.string()),
  beneficiary_applicable: z.boolean(),
  max_beneficiaries: z.number().optional(),
  geojson: z.unknown().nullable(),
  area_sqm: z.number().nullable(),
});

export const EventListResponseSchema = z.array(EventResponseSchema);

export const DeleteEventResponseSchema = z.object({
  deleted: z.boolean(),
});
