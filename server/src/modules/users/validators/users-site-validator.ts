import { z } from 'zod';
import {
  GenderType,
  PermissionKey,
  RoleType,
  VerificationStatus,
} from '../../../infastructures/prisma/common/client';
import { PORTAL_ROLE_TYPES } from '../../../shared/constants/portal-role-types';

export const USER_LIST_DEFAULT_PAGE_SIZE = 25;
export const USER_LIST_MAX_PAGE_SIZE = 100;

/** `all` keeps the portal's filter selects a single value space. */
export const UserStatusFilterSchema = z.enum([
  'all',
  'active',
  'restricted',
  'pending',
  'expired',
]);

/** Only a portal role can be provisioned — volunteers come through the app's signup. */
export const ProvisionableRoleSchema = z.enum(PORTAL_ROLE_TYPES);

/** One hour to 90 days. Beyond that it stops being a hand-over credential. */
export const CREDENTIAL_MIN_HOURS = 1;
export const CREDENTIAL_MAX_HOURS = 24 * 90;
export const CREDENTIAL_DEFAULT_HOURS = 72;

const CredentialLifetimeSchema = z.coerce
  .number()
  .int()
  .min(CREDENTIAL_MIN_HOURS)
  .max(CREDENTIAL_MAX_HOURS)
  .default(CREDENTIAL_DEFAULT_HOURS);

/**
 * `manual` carries the email the requester asked from, `generate` has the server mint
 * one. The password is always generated either way — an administrator choosing a
 * password for someone else is the thing this flow exists to avoid.
 */
export const ProvisionUserSchema = z
  .object({
    mode: z.enum(['manual', 'generate']),
    firstname: z.string().trim().min(1, 'First name is required').max(80),
    lastname: z.string().trim().min(1, 'Last name is required').max(80),
    email: z.email('A valid email address is required').max(160).optional(),
    role_type: ProvisionableRoleSchema,
    department: z.string().trim().max(120).optional(),
    phone_number: z.string().trim().min(7).max(25).optional(),
    /**
     * The complete set of actions the account should hold. Omit it to leave the
     * account on its role's baseline; the server stores only the departures.
     */
    permissions: z
      .array(z.enum(PermissionKey))
      .max(Object.keys(PermissionKey).length)
      .optional(),
    expires_in_hours: CredentialLifetimeSchema,
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.mode === 'manual' && !data.email) {
      ctx.addIssue({
        code: 'custom',
        path: ['email'],
        message: 'An email address is required when entering it manually',
      });
    }
  });

export const ReissueCredentialsSchema = z
  .object({
    expires_in_hours: CredentialLifetimeSchema,
  })
  .strict();

export const ListUsersQuerySchema = z
  .object({
    search: z.string().trim().max(120).optional(),
    role: z.union([z.literal('all'), z.enum(RoleType)]).default('all'),
    status: UserStatusFilterSchema.default('all'),
    page: z.coerce.number().int().min(1).default(1),
    page_size: z.coerce
      .number()
      .int()
      .min(1)
      .max(USER_LIST_MAX_PAGE_SIZE)
      .default(USER_LIST_DEFAULT_PAGE_SIZE),
  })
  .strict();

export const RestrictUserSchema = z
  .object({
    reason: z.string().trim().min(1, 'Reason is required').max(500),
  })
  .strict();

export const BlockUserIpSchema = z
  .object({
    ip_address: z
      .union([z.ipv4(), z.ipv6()], { error: 'A valid IP address is required' })
      .optional(),
    reason: z.string().trim().max(500).optional(),
  })
  .strict();

export const ManagedUserSchema = z.object({
  user_id: z.string(),
  firstname: z.string(),
  lastname: z.string(),
  email: z.string(),
  role_type: z.enum(RoleType),
  department: z.string().nullable(),
  status: z.enum(['active', 'restricted', 'pending', 'expired']),
  /** Set only while a provisioned credential is outstanding — null once it is replaced. */
  credential_expires_at: z.iso.datetime().nullable(),
  restriction_reason: z.string().nullable(),
  last_login_ip: z.string().nullable(),
  blocked_ips: z.array(z.string()),
  created_at: z.iso.datetime(),
});

export const ManagedUserDetailSchema = ManagedUserSchema.extend({
  middle_name: z.string().nullable(),
  gender: z.enum(GenderType),
  age: z.number(),
  phone_number: z.string(),
  current_address: z.string(),
  address: z.object({
    street: z.string().nullable(),
    barangay: z.string().nullable(),
    city: z.string().nullable(),
    province: z.string().nullable(),
  }),
  has_avatar: z.boolean(),
  has_signature: z.boolean(),
  restricted_at: z.iso.datetime().nullable(),
  updated_at: z.iso.datetime(),
  school_info: z
    .object({
      id_number: z.string(),
      department: z.string(),
      major: z.string(),
      year_level: z.string(),
      graduation_date: z.string(),
    })
    .nullable(),
  verifications: z.array(
    z.object({
      status: z.enum(VerificationStatus),
      submitted_at: z.iso.datetime(),
    }),
  ),
  interests: z.array(z.string()),
  blocked_ip_details: z.array(
    z.object({
      ip_address: z.string(),
      reason: z.string().nullable(),
      blocked_at: z.iso.datetime(),
    }),
  ),
});

export const ManagedUserListResponseSchema = z.object({
  items: z.array(ManagedUserSchema),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
});

/**
 * The plaintext credential, returned exactly once — at issue time. It is never stored
 * in a readable form, so an administrator who closes the dialog without copying it has
 * to re-issue rather than look it up.
 */
export const IssuedCredentialsSchema = z.object({
  email: z.string(),
  password: z.string(),
  expires_at: z.iso.datetime(),
});

export const ProvisionedUserResponseSchema = z.object({
  user: ManagedUserSchema,
  credentials: IssuedCredentialsSchema,
});
