import { z } from 'zod';
import {
  GenderType,
  RoleType,
  VerificationStatus,
} from '../../../infastructures/prisma/common/client';

export const USER_LIST_DEFAULT_PAGE_SIZE = 25;
export const USER_LIST_MAX_PAGE_SIZE = 100;

/** `all` keeps the portal's filter selects a single value space. */
export const UserStatusFilterSchema = z.enum([
  'all',
  'active',
  'restricted',
  'pending',
]);

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
  status: z.enum(['active', 'restricted', 'pending']),
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
