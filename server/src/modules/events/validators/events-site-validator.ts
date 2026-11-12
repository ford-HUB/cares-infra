import { z } from 'zod';
import { EventStatus } from '../../../infastructures/prisma/common/client';
import { geofenceRings } from '../../../shared/utils/geofence-utils';
import { CONTROL_CHARACTER_PATTERN } from '../../../shared/validators/control-character-validator';
import { plainLabel } from '../../../shared/validators/plain-label-validator';
import { withoutPrototypeKeys } from '../../../shared/validators/prototype-key-validator';

export const EVENT_MAX_IMAGE_COUNT = 3;
export const EVENT_MAX_IMAGE_BYTES = 3 * 1024 * 1024;
export const EVENT_ALLOWED_IMAGE_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const EVENT_MAX_PARTICIPANTS = 10000;
export const EVENT_MAX_GOODS_TYPES = 20;

/** The categories the portal's form offers. */
export const EVENT_CATEGORIES = [
  'School',
  'Community',
  'Emergency',
  'Donation Drive',
  'Charity',
  'Relief Program',
  'Health',
  'Outreach',
  'Training',
  'Seminar',
  'Others',
] as const;

/** Multipart bodies deliver everything as strings, so booleans/numbers/JSON are coerced. */
const booleanFromString = z
  .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
  .transform((v) => v === true || v === 'true' || v === '1');

/** A plain decimal, so `Number()` cannot read `0x10` or an empty box as a real count. */
const NUMERIC_TEXT_PATTERN = /^-?\d+(\.\d+)?(e[+-]?\d+)?$/i;

const numberFromString = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => {
    if (typeof v !== 'string') return v;
    if (v.trim() === '') return undefined;
    return NUMERIC_TEXT_PATTERN.test(v.trim()) ? Number(v) : v;
  }, schema);

/** One value arrives as a string and several as an array; leaving it out means none. */
const listFromString = <T extends z.ZodType>(item: T, max: number) =>
  z.preprocess(
    (v) => (v === undefined ? [] : typeof v === 'string' ? [v] : v),
    z.array(item).max(max),
  );

const geojsonFromString = z
  .union([z.string(), z.record(z.string(), z.unknown()), z.null()])
  .optional()
  .transform((v, ctx) => {
    if (v === undefined || v === null || v === '') return null;
    let parsed: unknown = v;
    if (typeof v === 'string') {
      try {
        parsed = JSON.parse(v);
      } catch {
        parsed = null;
      }
    }
    // The attendance geofence reads this, so a shape it cannot use is refused here
    // rather than quietly saving an event with no working boundary.
    if (!geofenceRings(parsed)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Enter a valid event boundary',
      });
      return z.NEVER;
    }
    return parsed;
  });

/** `2026-12-01T09:00`, with seconds and an offset optional. `new Date()` alone reads `' OR '1'='1` as 2001. */
const DATE_TIME_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})?$/;

const eventDateTime = (requiredMessage: string) =>
  z
    .string()
    .min(1, requiredMessage)
    .refine(
      (value) =>
        value === '' ||
        (DATE_TIME_PATTERN.test(value) && !Number.isNaN(Date.parse(value))),
      { message: 'Enter a valid date and time' },
    );

/**
 * The image route fetches whatever is stored here from the bucket every feature shares,
 * so a reference must resolve to a file this feature uploaded — `events/{name}`, as a
 * bare key or as its object URL. A URL is resolved first, so `..` cannot climb out.
 */
const EVENT_IMAGE_KEY_PATTERN = /^events\/[a-zA-Z0-9][a-zA-Z0-9._-]*$/;

const isEventImageReference = (value: string): boolean => {
  if (!/^https?:\/\//.test(value)) return EVENT_IMAGE_KEY_PATTERN.test(value);
  try {
    return EVENT_IMAGE_KEY_PATTERN.test(
      new URL(value).pathname.replace(/^\//, ''),
    );
  } catch {
    return false;
  }
};

const existingEventImage = z
  .string()
  .refine(isEventImageReference, { message: 'Unknown event image' });

export const CreateEventSchema = withoutPrototypeKeys(
  z
    .object({
      title: plainLabel(
        z
          .string()
          .trim()
          .min(3, 'Event title must be at least 3 characters')
          .max(255),
        'Title',
      ),
      description: z
        .string()
        .trim()
        .min(10, 'Description must be at least 10 characters')
        .max(2000)
        .refine((value) => !CONTROL_CHARACTER_PATTERN.test(value), {
          message: 'Description cannot contain control characters',
        }),
      event_started: eventDateTime('Start date and time is required'),
      event_ended: eventDateTime('End date and time is required'),
      location: plainLabel(
        z
          .string()
          .trim()
          .min(3, 'Location must be at least 3 characters')
          .max(255),
        'Location',
      ),
      max_participants: numberFromString(
        z.number().int().min(1).max(EVENT_MAX_PARTICIPANTS),
      ),
      organizer_name: plainLabel(
        z.string().trim().min(2).max(255),
        'Organizer name',
      ),
      category: z
        .string()
        .trim()
        .min(1, 'Category is required')
        .refine(
          (value) =>
            value === '' ||
            (EVENT_CATEGORIES as readonly string[]).includes(value),
          { message: 'Unknown category' },
        ),
      department: plainLabel(
        z.string().trim().max(200),
        'Department',
      ).optional(),
      specified_category: plainLabel(
        z.string().trim().max(200),
        'Category name',
      ).optional(),
      beneficiary_applicable: booleanFromString.default(false),
      max_beneficiaries: numberFromString(
        z.number().int().positive().max(EVENT_MAX_PARTICIPANTS).optional(),
      ),
      funds_donation: booleanFromString.default(false),
      goods_donation: booleanFromString.default(false),
      goods_types: listFromString(
        plainLabel(z.string().trim().min(1).max(120), 'Goods type'),
        EVENT_MAX_GOODS_TYPES,
      ),
      event_images_existing: listFromString(
        existingEventImage,
        EVENT_MAX_IMAGE_COUNT,
      ),
      geojson: geojsonFromString,
      area_sqm: numberFromString(z.number().min(0).optional()),
      marker_lat: numberFromString(z.number().min(-90).max(90).optional()),
      marker_lng: numberFromString(z.number().min(-180).max(180).optional()),
    })
    .strict()
    .refine(
      (data) => new Date(data.event_ended) > new Date(data.event_started),
      {
        message: 'End must be after start',
        path: ['event_ended'],
      },
    )
    .refine((data) => data.category !== 'School' || Boolean(data.department), {
      message: 'Department is required for School events',
      path: ['department'],
    })
    .refine(
      (data) =>
        data.category !== 'Others' ||
        (data.specified_category?.length ?? 0) >= 2,
      {
        message: 'Please specify a category name',
        path: ['specified_category'],
      },
    )
    .refine(
      (data) =>
        !data.beneficiary_applicable ||
        !data.goods_donation ||
        data.goods_types.length > 0,
      {
        message: 'Select at least one accepted goods type',
        path: ['goods_types'],
      },
    )
    .refine(
      (data) =>
        (data.marker_lat === undefined) === (data.marker_lng === undefined),
      {
        message: 'A map marker needs both a latitude and a longitude',
        path: ['marker_lng'],
      },
    ),
);

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

export const EventImageIndexParamSchema = z
  .union([z.string(), z.number()])
  .transform((v) => (typeof v === 'string' ? Number(v) : v))
  .pipe(
    z
      .number()
      .int()
      .min(0)
      .max(EVENT_MAX_IMAGE_COUNT - 1),
  );

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
  marker_lat: z.number().nullable(),
  marker_lng: z.number().nullable(),
});

export const EventListResponseSchema = z.array(EventResponseSchema);

export const DeleteEventResponseSchema = z.object({
  deleted: z.boolean(),
});
