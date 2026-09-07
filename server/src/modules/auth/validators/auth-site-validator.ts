import { z } from 'zod';
import { RoleType } from '../../../infastructures/prisma/common/client';

export const LoginSchema = z
  .object({
    email: z
      .string()
      .trim()
      .email()
      .transform((value) => value.toLowerCase()),
    password: z.string().min(1),
  })
  .strict();

export const LoginResponseSchema = z.object({
  user_id: z.string(),
  role_type: z.enum(RoleType),
  email: z.string(),
  firstname: z.string(),
  has_interests: z.boolean(),
  access_token: z.string(),
});

export const AdminLoginResponseSchema = LoginResponseSchema.extend({
  lastname: z.string(),
});

export const MeResponseSchema = z.object({
  user_id: z.string(),
  email: z.string(),
  firstname: z.string(),
  lastname: z.string(),
  role_type: z.enum(RoleType),
  /** The root operator account — its sign-in email is fixed. */
  is_protected: z.boolean(),
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

export const AccessRequestSchema = z
  .object({
    from_email: z
      .string()
      .trim()
      .email()
      .transform((value) => value.toLowerCase()),
    subject: z.string().trim().min(1).max(200),
    body: z.string().trim().min(20).max(10000),
  })
  .strict();

export const AccessRequestResponseSchema = z.object({
  delivered_to: z.string(),
  attachment_count: z.number(),
});
