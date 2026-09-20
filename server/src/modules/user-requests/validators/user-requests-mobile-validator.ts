import { z } from 'zod';
import {
  RoleType,
  UserRequestKind,
  UserRequestStatus,
} from '../../../infastructures/prisma/common/client';

/** Every mobile side can file; the app's role switcher is local to the device. */
export const MOBILE_USER_REQUEST_ROLE_TYPES = [
  RoleType.VOLUNTEER,
  RoleType.DONOR,
  RoleType.BENEFICIARY,
] as const;

/**
 * The volunteer side is the only one gated by an ID check, so it is the only
 * role that can be asked for this way.
 */
export const REQUESTABLE_ROLE_TYPES = [RoleType.VOLUNTEER] as const;

export const CreateRoleAccessRequestSchema = z
  .object({
    /** The registration session that holds the validated ID and matched selfie. */
    registrationId: z.uuid('A valid registration id is required'),
    roleType: z.enum(REQUESTABLE_ROLE_TYPES),
  })
  .strict();

export const CreateEventJoinRequestSchema = z
  .object({
    eventId: z.coerce.number().int().positive(),
  })
  .strict();

export const MobileUserRequestSchema = z.object({
  user_request_id: z.string(),
  reference_number: z.number(),
  kind: z.enum(UserRequestKind),
  status: z.enum(UserRequestStatus),
  requested_role: z.enum(RoleType).nullable(),
  event_id: z.number().nullable(),
  summary: z.string(),
  decided_at: z.iso.datetime().nullable(),
  created_at: z.iso.datetime(),
});

export const MobileUserRequestListResponseSchema = z.object({
  items: z.array(MobileUserRequestSchema),
});

export const MobileUserRequestResponseSchema = MobileUserRequestSchema;
