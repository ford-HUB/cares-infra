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
