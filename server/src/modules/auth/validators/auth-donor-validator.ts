import { z } from 'zod';
import { PhoneNumberSchema } from '../../../shared/validators/phone-number-validator';
import {
  AuthProvider,
  GenderType,
} from '../../../infastructures/prisma/common/client';
import { LoginResponseSchema } from './auth-mobile-validator';

export const DonorOAuthSchema = z
  .object({
    provider: z.enum(AuthProvider),
    /** Google hands the client an ID token; Facebook an access token. */
    token: z.string().trim().min(1),
  })
  .strict();

export const DonorOAuthProfileSchema = z.object({
  provider: z.enum(AuthProvider),
  email: z.string(),
  firstname: z.string(),
  middle_name: z.string(),
  lastname: z.string(),
  avatar: z.string().nullable(),
});

export const DonorOAuthStatusSchema = z.enum([
  /** The identity already maps to a CARES account — `session` carries the token. */
  'signed_in',
  /** Verified, but new here — finish the donor form and post the ticket back. */
  'registration_required',
]);

export const DonorOAuthResponseSchema = z.object({
  status: DonorOAuthStatusSchema,
  session: LoginResponseSchema.nullable(),
  profile: DonorOAuthProfileSchema.nullable(),
  /** Redis handle proving this profile was verified; spent by donor registration. */
  oauth_ticket: z.string().nullable(),
});

const DonorDetailsSchema = z.object({
  firstname: z.string().trim().min(1),
  lastname: z.string().trim().min(1),
  middle_name: z.string().trim().optional().default(''),
  phone_number: PhoneNumberSchema,
  current_address: z.string().trim().min(1),
  gender: z.enum(GenderType).optional().default(GenderType.OTHER),
});

export const RegisterDonorSchema = DonorDetailsSchema.extend({
  oauth_ticket: z.uuid(),
}).strict();

/**
 * Email + password donor sign-up. No provider vouches for the address here, so the
 * email must already have passed the shared OTP check (`/v1/auth/verify-otp`).
 */
export const RegisterDonorWithEmailSchema = DonorDetailsSchema.extend({
  email: z.string().trim().email(),
  password: z.string().min(8),
}).strict();
