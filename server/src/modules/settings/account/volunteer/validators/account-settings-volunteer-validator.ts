import { z } from 'zod';
import { LoginSource } from '../../../../../infastructures/prisma/common/client';

const OtpSchema = z
  .string()
  .trim()
  .length(6)
  .regex(/^\d{6}$/, 'Enter the 6-digit code');

/** The code sent to the current inbox. */
export const VerifyEmailChangeOtpSchema = z
  .object({
    otp: OtpSchema,
  })
  .strict();

/** Plus the token from `verify-code`. */
export const ChangeEmailSchema = z
  .object({
    change_token: z.uuid(),
    new_email: z
      .string()
      .trim()
      .email('Enter a valid email address')
      .transform((value) => value.toLowerCase()),
  })
  .strict();

export const ChangePasswordSchema = z
  .object({
    current_password: z.string().min(1, 'Enter your current password'),
    // Policy rules run in the service so the message names the missed rule.
    new_password: z.string().min(8, 'Password must be at least 8 characters'),
  })
  .strict();

export const SessionIdParamSchema = z.uuid();

export const SendEmailChangeOtpResponseSchema = z.object({
  email: z.string(),
  sent: z.boolean(),
  /** A live code existed, so nothing was mailed. */
  reused: z.boolean(),
  expiresInSeconds: z.number(),
});

export const VerifyEmailChangeOtpResponseSchema = z.object({
  changeToken: z.string(),
  expiresInSeconds: z.number(),
});

export const ChangeEmailResponseSchema = z.object({
  email: z.string(),
  /** Re-signed with the new address; the app must swap it in. */
  access_token: z.string(),
});

export const ChangePasswordResponseSchema = z.object({
  updated: z.boolean(),
  /** So a stolen session dies with the old password. */
  revoked_sessions: z.number(),
});

/** Caller's own devices only. */
export const OwnSessionSchema = z.object({
  session_id: z.string(),
  source: z.enum(LoginSource),
  ip_address: z.string(),
  user_agent: z.string().nullable(),
  created_at: z.iso.datetime(),
  last_seen_at: z.iso.datetime(),
  expires_at: z.iso.datetime(),
  /** Can't be revoked from the list. */
  is_current: z.boolean(),
});

export const OwnSessionsResponseSchema = z.object({
  items: z.array(OwnSessionSchema),
});

export const RevokeOwnSessionsResponseSchema = z.object({
  revoked: z.number(),
});
