import { z } from 'zod';

export const ChangeEmailSchema = z
  .object({
    current_password: z.string().min(1, 'Current password is required'),
    new_email: z
      .string()
      .trim()
      .email('Enter a valid email address')
      .transform((v) => v.toLowerCase()),
  })
  .strict();

export const ChangePasswordSchema = z
  .object({
    current_password: z.string().min(1, 'Current password is required'),
    new_password: z.string().min(8, 'Password must be at least 8 characters'),
  })
  .strict();

export const ChangeEmailResponseSchema = z.object({
  email: z.string(),
  access_token: z.string(),
});

export const ChangePasswordResponseSchema = z.object({
  message: z.string(),
});
