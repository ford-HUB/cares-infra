import { z } from 'zod';
import {
  EventParticipationRole,
  RoleType,
  UserRequestKind,
  UserRequestStatus,
} from '../../../infastructures/prisma/common/client';

/** Every mobile side can file; the role switcher is device-local. */
export const MOBILE_USER_REQUEST_ROLE_TYPES = [
  RoleType.VOLUNTEER,
  RoleType.DONOR,
  RoleType.BENEFICIARY,
] as const;

/** Only the volunteer side is ID-gated. */
export const REQUESTABLE_ROLE_TYPES = [RoleType.VOLUNTEER] as const;

export const CreateRoleAccessRequestSchema = z
  .object({
    /** Holds the validated ID and matched selfie. */
    registrationId: z.uuid('A valid registration id is required'),
    roleType: z.enum(REQUESTABLE_ROLE_TYPES),
  })
  .strict();

/** Multipart: `eventId` + `proof`. */
export const CreateEventJoinRequestSchema = z
  .object({
    eventId: z.coerce.number().int().positive(),
  })
  .strict();

/** The role switcher is local, so the app names the side (e.g. `role=BENEFICIARY`). Default: registered role. */
export const EventJoinRoleQuerySchema = z.object({
  role: z.enum(MOBILE_USER_REQUEST_ROLE_TYPES).optional(),
});

/** PDF only. */
export const EVENT_JOIN_PROOF_MAX_BYTES = 10 * 1024 * 1024;
export const EVENT_JOIN_PROOF_ALLOWED_MIMES = ['application/pdf'] as const;

export const MobileUserRequestSchema = z.object({
  user_request_id: z.string(),
  reference_number: z.number(),
  kind: z.enum(UserRequestKind),
  status: z.enum(UserRequestStatus),
  requested_role: z.enum(RoleType).nullable(),
  /** EVENT_ROLE only. */
  participation_role: z.enum(EventParticipationRole).nullable(),
  event_id: z.number().nullable(),
  summary: z.string(),
  decided_at: z.iso.datetime().nullable(),
  /** REJECTED only; shown to the requester. */
  rejection_reason: z.string().nullable(),
  created_at: z.iso.datetime(),
});

export const MobileUserRequestListResponseSchema = z.object({
  items: z.array(MobileUserRequestSchema),
});

export const MobileUserRequestResponseSchema = MobileUserRequestSchema;
