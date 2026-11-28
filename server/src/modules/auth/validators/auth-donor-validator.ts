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
    /** Google: ID token; Facebook: access token. */
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
  /** Known account; `session` carries the token. */
  'signed_in',
  /** New: finish the donor form and post the ticket back. */
  'registration_required',
]);

export const DonorOAuthResponseSchema = z.object({
  status: DonorOAuthStatusSchema,
  session: LoginResponseSchema.nullable(),
  profile: DonorOAuthProfileSchema.nullable(),
  /** Redis handle for the verified profile; spent by donor registration. */
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

/** No provider vouches for the email, so it must pass `/v1/auth/verify-otp` first. */
export const RegisterDonorWithEmailSchema = DonorDetailsSchema.extend({
  email: z.string().trim().email(),
  password: z.string().min(8),
}).strict();
