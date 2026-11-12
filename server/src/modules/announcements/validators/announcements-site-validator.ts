import { z } from 'zod';
import {
  AnnouncementAudience,
  AnnouncementChannel,
  AnnouncementState,
  AnnouncementTone,
} from '../../../infastructures/prisma/common/client';
import { CONTROL_CHARACTER_PATTERN } from '../../../shared/validators/control-character-validator';
import { plainLabel } from '../../../shared/validators/plain-label-validator';
import { withoutPrototypeKeys } from '../../../shared/validators/prototype-key-validator';

/**
 * The board filters and sorts client-side, so the list is fetched whole rather than
 * paged — capped so a runaway board cannot ship unbounded rows.
 */
export const ANNOUNCEMENTS_DEFAULT_LIMIT = 200;
export const ANNOUNCEMENTS_MAX_LIMIT = 500;

export const ListAnnouncementsQuerySchema = z
  .object({
    state: z
      .union([z.literal('all'), z.enum(AnnouncementState)])
      .default('all'),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(ANNOUNCEMENTS_MAX_LIMIT)
      .default(ANNOUNCEMENTS_DEFAULT_LIMIT),
  })
  .strict();

/** Hyphen-separated letters and digits (`win-db-migration`, or a uuid), never a hex literal. */
const WINDOW_ID_PATTERN = /^(?!0x)[a-z0-9]+(?:-[a-z0-9]+)*$/i;

/**
 * The full draft, as the dialog submits it. Only `draft` and `scheduled` can be chosen
 * from the editor — publishing and taking down go through the state endpoint so the
 * publish timestamp and reach are set by the server, not the client.
 */
export const SaveAnnouncementSchema = withoutPrototypeKeys(
  z
    .object({
      title: plainLabel(
        z.string().trim().min(1, 'Title is required').max(200),
        'Title',
      ),
      body: z
        .string()
        .trim()
        .min(1, 'Message is required')
        .max(4000)
        .refine((value) => !CONTROL_CHARACTER_PATTERN.test(value), {
          message: 'Message cannot contain control characters',
        }),
      tone: z.enum(AnnouncementTone),
      audiences: z
        .array(z.enum(AnnouncementAudience))
        .min(1, 'Pick at least one audience')
        .max(Object.keys(AnnouncementAudience).length),
      channels: z
        .array(z.enum(AnnouncementChannel))
        .min(1, 'Pick at least one channel')
        .max(Object.keys(AnnouncementChannel).length),
      state: z.enum([AnnouncementState.DRAFT, AnnouncementState.SCHEDULED]),
      publish_at: z.iso.datetime(),
      expires_at: z.iso.datetime().nullable(),
      pinned: z.boolean(),
      window_id: z
        .string()
        .max(100)
        .regex(WINDOW_ID_PATTERN, 'A valid maintenance window id is required')
        .nullable(),
    })
    .strict()
    .refine(
      (value) =>
        value.expires_at === null ||
        new Date(value.expires_at) > new Date(value.publish_at),
      {
        message: 'Expiry must come after the publish time',
        path: ['expires_at'],
      },
    ),
);

/** Publish now, or pull a published notice back down. */
export const SetAnnouncementStateSchema = z
  .object({
    state: z.enum([AnnouncementState.PUBLISHED, AnnouncementState.EXPIRED]),
  })
  .strict();

export const SetAnnouncementPinnedSchema = z
  .object({ pinned: z.boolean() })
  .strict();

export const AnnouncementSchema = z.object({
  announcement_id: z.string(),
  title: z.string(),
  body: z.string(),
  tone: z.enum(AnnouncementTone),
  audiences: z.array(z.enum(AnnouncementAudience)),
  channels: z.array(z.enum(AnnouncementChannel)),
  state: z.enum(AnnouncementState),
  publish_at: z.iso.datetime(),
  expires_at: z.iso.datetime().nullable(),
  pinned: z.boolean(),
  window_id: z.string().nullable(),
  author_id: z.string().nullable(),
  author_name: z.string(),
  reach: z.number(),
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime(),
});

export const AnnouncementListResponseSchema = z.object({
  items: z.array(AnnouncementSchema),
  /** Total matching rows on the server, which may exceed what was returned. */
  total: z.number(),
});

export const AnnouncementResponseSchema = AnnouncementSchema;
