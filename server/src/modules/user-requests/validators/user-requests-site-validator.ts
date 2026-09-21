import { z } from 'zod';
import {
  RoleType,
  UserRequestKind,
  UserRequestStatus,
} from '../../../infastructures/prisma/common/client';

/**
 * The portal groups the queue by day and works it client-side, so the list is
 * fetched whole — capped so a runaway queue cannot ship unbounded rows.
 */
export const USER_REQUESTS_DEFAULT_LIMIT = 200;
export const USER_REQUESTS_MAX_LIMIT = 500;

export const ListUserRequestsQuerySchema = z
  .object({
    status: z
      .union([z.literal('all'), z.enum(UserRequestStatus)])
      .default('all'),
    kind: z.union([z.literal('all'), z.enum(UserRequestKind)]).default('all'),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(USER_REQUESTS_MAX_LIMIT)
      .default(USER_REQUESTS_DEFAULT_LIMIT),
  })
  .strict();

/** Which stored proof image a `GET :id/attachments/:kind` streams back. */
export const UserRequestAttachmentKindSchema = z.enum([
  'id-front',
  'id-back',
  'selfie',
  'residency-proof',
]);

export const UserRequestAttachmentSchema = z.object({
  /** Stable per request: `id-front`, `id-back`, `selfie`, `residency-proof`. */
  kind: UserRequestAttachmentKindSchema,
  label: z.string(),
  /** Set when the file is not necessarily an image (a PDF proof of residency). */
  content_type: z.string().nullable(),
});

export const UserRequestTrailEntrySchema = z.object({
  user_request_trail_entry_id: z.string(),
  label: z.string(),
  actor_name: z.string(),
  created_at: z.iso.datetime(),
});

export const UserRequestSchema = z.object({
  user_request_id: z.string(),
  reference_number: z.number(),
  kind: z.enum(UserRequestKind),
  status: z.enum(UserRequestStatus),
  requester_id: z.string(),
  requester_firstname: z.string(),
  requester_lastname: z.string(),
  requester_email: z.string(),
  requester_role_type: z.enum(RoleType),
  requester_barangay: z.string().nullable(),
  requested_role: z.enum(RoleType).nullable(),
  event_id: z.number().nullable(),
  event_title: z.string().nullable(),
  event_started: z.iso.datetime().nullable(),
  summary: z.string(),
  face_similarity: z.number().nullable(),
  attachments: z.array(UserRequestAttachmentSchema),
  decided_by_name: z.string().nullable(),
  decided_at: z.iso.datetime().nullable(),
  trail: z.array(UserRequestTrailEntrySchema),
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime(),
});

export const UserRequestListResponseSchema = z.object({
  items: z.array(UserRequestSchema),
  total: z.number(),
});

export const UserRequestResponseSchema = UserRequestSchema;
