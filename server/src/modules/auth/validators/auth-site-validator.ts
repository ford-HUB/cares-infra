import { z } from 'zod';
import {
  PermissionKey,
  RoleType,
} from '../../../infastructures/prisma/common/client';
import { SessionSuspensionSchema } from '../../access-control/validators/access-control-site-validator';
import { CONTROL_CHARACTER_PATTERN } from '../../../shared/validators/control-character-validator';
import { withoutPrototypeKeys } from '../../../shared/validators/prototype-key-validator';

export const LoginSchema = withoutPrototypeKeys(
  z
    .object({
      email: z
        .string()
        .trim()
        .email()
        .transform((value) => value.toLowerCase()),
      password: z.string().min(1),
    })
    .strict(),
);

export const LoginResponseSchema = z.object({
  user_id: z.string(),
  role_type: z.enum(RoleType),
  email: z.string(),
  firstname: z.string(),
  has_interests: z.boolean(),
  access_token: z.string(),
});

/**
 * The rights in force for the account — baseline + grants − revokes − active
 * suspensions. The portal builds its navigation and route guards from this list.
 */
const PermissionsSchema = z.array(z.enum(PermissionKey));

/** Active suspensions on the account, so the portal can show what was locked and why. */
const SuspensionsSchema = z.array(SessionSuspensionSchema);

export const AdminLoginResponseSchema = LoginResponseSchema.extend({
  lastname: z.string(),
  permissions: PermissionsSchema,
  suspensions: SuspensionsSchema,
});

export const MeResponseSchema = z.object({
  user_id: z.string(),
  email: z.string(),
  firstname: z.string(),
  lastname: z.string(),
  role_type: z.enum(RoleType),
  /** The root operator account — its sign-in email is fixed. */
  is_protected: z.boolean(),
  permissions: PermissionsSchema,
  suspensions: SuspensionsSchema,
});

/** Mirrors the portal's Request Access form limits (site/src/constants/request-access.ts). */
export const ACCESS_REQUEST_MAX_FILES = 5;
export const ACCESS_REQUEST_MAX_FILE_BYTES = 5 * 1024 * 1024;
export const ACCESS_REQUEST_MAX_TOTAL_BYTES = 15 * 1024 * 1024;

export const ACCESS_REQUEST_ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
];

/**
 * The subject becomes the mail's Subject header, so it is held to plain prose:
 * letters, digits, spaces and sentence punctuation — never two punctuation marks
 * in a row (`'--`, `()`, `!!!`), a colon that isn't followed by a space
 * (`javascript:`), or a hex literal (`0x27…`, a quote smuggled past the filter).
 */
const SUBJECT_ALLOWED_PATTERN = /^[\p{L}\p{N} .,'\-()&/:?!]+$/u;
const SUBJECT_PUNCTUATION_RUN_PATTERN = /[.,'\-()&/:?!]{2,}/;
const SUBJECT_BARE_COLON_PATTERN = /:(?! |$)/;
const SUBJECT_HEX_LITERAL_PATTERN = /\b0x[0-9a-f]+\b/i;

export const AccessRequestSchema = withoutPrototypeKeys(
  z
    .object({
      from_email: z
        .string()
        .trim()
        .email()
        .transform((value) => value.toLowerCase()),
      subject: z
        .string()
        .trim()
        .min(1)
        .max(200)
        .regex(
          SUBJECT_ALLOWED_PATTERN,
          'Subject may only contain letters, numbers, spaces and basic punctuation',
        )
        .refine((value) => !SUBJECT_PUNCTUATION_RUN_PATTERN.test(value), {
          message: 'Subject cannot contain repeated punctuation',
        })
        .refine((value) => !SUBJECT_BARE_COLON_PATTERN.test(value), {
          message: 'A colon in the subject must be followed by a space',
        })
        .refine((value) => !SUBJECT_HEX_LITERAL_PATTERN.test(value), {
          message: 'Subject cannot contain encoded values',
        }),
      body: z
        .string()
        .trim()
        .min(20)
        .max(10000)
        .refine((value) => !CONTROL_CHARACTER_PATTERN.test(value), {
          message: 'Message cannot contain control characters',
        }),
    })
    .strict(),
);

export const AccessRequestResponseSchema = z.object({
  delivered_to: z.string(),
  attachment_count: z.number(),
});

export const PortalForgotPasswordSchema = withoutPrototypeKeys(
  z
    .object({
      email: z
        .string()
        .trim()
        .email()
        .transform((value) => value.toLowerCase()),
    })
    .strict(),
);

export const PortalForgotPasswordResponseSchema = z.object({
  email: z.string(),
  /** How long before another temporary password may be requested for this email. */
  retry_after_seconds: z.number(),
});
