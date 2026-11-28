import { z } from 'zod';
import {
  GenderType,
  PermissionKey,
  RoleType,
  VerificationStatus,
} from '../../../infastructures/prisma/common/client';
import {
  isPortalRole,
  PORTAL_ROLE_TYPES,
} from '../../../shared/constants/portal-role-types';
import { CONTROL_CHARACTER_PATTERN } from '../../../shared/validators/control-character-validator';
import { withoutPrototypeKeys } from '../../../shared/validators/prototype-key-validator';
import { PARTNER_BARANGAYS } from '../../auth/validators/auth-mobile-validator';

export const USER_LIST_DEFAULT_PAGE_SIZE = 25;
export const USER_LIST_MAX_PAGE_SIZE = 100;

/** `all` keeps the filter a single value space. */
export const UserStatusFilterSchema = z.enum([
  'all',
  'active',
  'restricted',
  'pending',
  'expired',
]);

/** "Regular User" roles; mobile sign-in only. */
export const PROVISIONABLE_APP_ROLE_TYPES = [
  RoleType.VOLUNTEER,
  RoleType.DONOR,
  RoleType.BENEFICIARY,
] as const;

export const ProvisionableRoleSchema = z.enum([
  ...PORTAL_ROLE_TYPES,
  ...PROVISIONABLE_APP_ROLE_TYPES,
]);

/** Must match the mobile `VolunteerType.apiValue`. Volunteers only, and required for them. */
export const ProvisionVolunteerTypeSchema = z.enum([
  'STUDENT',
  'STAFF',
  'ALUMNI',
  'PARTNER_BARANGAY',
]);

/** The barangay stands in for the department. */
export const PARTNER_BARANGAY_VOLUNTEER_TYPE = 'PARTNER_BARANGAY';

/** 1 hour to 90 days. */
export const CREDENTIAL_MIN_HOURS = 1;
export const CREDENTIAL_MAX_HOURS = 24 * 90;
export const CREDENTIAL_DEFAULT_HOURS = 72;

/** Must match site/src/constants/manage-users.ts; statistics group by these names. */
export const PROVISIONABLE_DEPARTMENTS = [
  'College of Maritime Engineering',
  'College of Teacher Education (BSED)',
  'College of Maritime Transportation',
  'College of Nursing',
  'Senior High School Department',
  'College of Teacher Education (BEED)',
  'College of Business and Accountancy',
  'College of Computer Studies',
  'College of Criminology',
  'College of Customs Administration',
  'College of Engineering',
  'College of Hospitality and Tourism Management',
  'Basic Education (Junior High School)',
  'Basic Education (Elementary)',
  'Non-Teaching Personnel',
] as const;

const CredentialLifetimeSchema = z
  .number()
  .int()
  .min(CREDENTIAL_MIN_HOURS)
  .max(CREDENTIAL_MAX_HOURS)
  .default(CREDENTIAL_DEFAULT_HOURS);

/** `manual` takes the requester's email, `generate` mints one. Password is always generated; name and phone are left to the holder. */
export const ProvisionUserSchema = withoutPrototypeKeys(
  z
    .object({
      mode: z.enum(['manual', 'generate']),
      email: z.email('A valid email address is required').max(160).optional(),
      recipient_email: z
        .email('A valid recipient email address is required')
        .max(160),
      role_type: ProvisionableRoleSchema,
      volunteer_type: ProvisionVolunteerTypeSchema.optional(),
      department: z
        .string()
        .trim()
        .pipe(z.enum(PROVISIONABLE_DEPARTMENTS))
        .optional(),
      /** Required only for `PARTNER_BARANGAY` volunteers. */
      partner_barangay: z.enum(PARTNER_BARANGAYS).optional(),
      /** Full desired set; omit for the role baseline. Only departures are stored. */
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

      if (data.role_type === RoleType.VOLUNTEER && !data.volunteer_type) {
        ctx.addIssue({
          code: 'custom',
          path: ['volunteer_type'],
          message:
            'Choose whether the volunteer is a student, staff, alumni or partner barangay',
        });
      }
      if (data.role_type !== RoleType.VOLUNTEER && data.volunteer_type) {
        ctx.addIssue({
          code: 'custom',
          path: ['volunteer_type'],
          message: 'A volunteer type only applies to volunteer accounts',
        });
      }

      const isPartnerBarangay =
        data.volunteer_type === PARTNER_BARANGAY_VOLUNTEER_TYPE;
      if (isPartnerBarangay && !data.partner_barangay) {
        ctx.addIssue({
          code: 'custom',
          path: ['partner_barangay'],
          message: 'Choose the partner barangay the volunteer belongs to',
        });
      }
      if (!isPartnerBarangay && data.partner_barangay) {
        ctx.addIssue({
          code: 'custom',
          path: ['partner_barangay'],
          message:
            'A partner barangay only applies to partner barangay volunteers',
        });
      }
      // Partner-barangay volunteers have no UCLM department.
      if (isPartnerBarangay && data.department) {
        ctx.addIssue({
          code: 'custom',
          path: ['department'],
          message: 'A partner barangay volunteer is not part of a department',
        });
      }

      // App accounts hold no portal rights.
      if (!isPortalRole(data.role_type) && data.permissions) {
        ctx.addIssue({
          code: 'custom',
          path: ['permissions'],
          message: 'Access scope only applies to portal accounts',
        });
      }
    }),
);

/** Loose: malformed input returns `valid: false` with a reason, not 400. */
export const CheckProvisionEmailSchema = withoutPrototypeKeys(
  z
    .object({
      email: z.string().trim().min(1, 'An email address is required').max(160),
    })
    .strict(),
);

export const ProvisionEmailCheckResponseSchema = z.object({
  email: z.string(),
  valid: z.boolean(),
  /** Null when it passed. */
  reason: z.string().nullable(),
});

export const ReissueCredentialsSchema = withoutPrototypeKeys(
  z
    .object({
      expires_in_hours: CredentialLifetimeSchema,
    })
    .strict(),
);

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

export const BlockUserIpSchema = withoutPrototypeKeys(
  z
    .object({
      ip_address: z
        .union([z.ipv4(), z.ipv6()], {
          error: 'A valid IP address is required',
        })
        .optional(),
      reason: z
        .string()
        .trim()
        .max(500)
        .refine((value) => !CONTROL_CHARACTER_PATTERN.test(value), {
          message: 'Reason cannot contain control characters',
        })
        .optional(),
    })
    .strict(),
);

export const ManagedUserSchema = z.object({
  user_id: z.string(),
  firstname: z.string(),
  lastname: z.string(),
  email: z.string(),
  role_type: z.enum(RoleType),
  department: z.string().nullable(),
  status: z.enum(['active', 'restricted', 'pending', 'expired']),
  /** Null once replaced. */
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

/** Plaintext, returned once; never stored readably. */
export const IssuedCredentialsSchema = z.object({
  email: z.string(),
  password: z.string(),
  expires_at: z.iso.datetime(),
});

/** Null when nothing was mailed (re-issue); failures are a notice, not an error. */
export const CredentialDeliverySchema = z.object({
  recipient: z.string(),
  sent: z.boolean(),
});

export const ProvisionedUserResponseSchema = z.object({
  user: ManagedUserSchema,
  credentials: IssuedCredentialsSchema,
  delivery: CredentialDeliverySchema.nullable(),
});
