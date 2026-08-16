import { z } from 'zod';
import {
  GenderType,
  RoleType,
} from '../../../infastructures/prisma/common/client';

export const UpdatePortalProfileSchema = z
  .object({
    firstname: z.string().trim().min(1, 'First name is required').max(80),
    lastname: z.string().trim().min(1, 'Last name is required').max(80),
    phone_number: z.string().trim().min(7, 'Phone number is required').max(25),
    gender: z.enum(GenderType),
    age: z.coerce
      .number()
      .int('Age must be a whole number')
      .min(18, 'Age must be at least 18')
      .max(120, 'Age must be 120 or below'),
    department: z.string().trim().max(120).optional(),
    address_street: z.string().trim().min(1, 'Street is required').max(200),
    address_barangay: z.string().trim().min(1, 'Barangay is required').max(120),
    address_city: z.string().trim().min(1, 'City is required').max(120),
    address_province: z.string().trim().min(1, 'Province is required').max(120),
  })
  .strict();

export const PortalProfileResponseSchema = z.object({
  firstname: z.string(),
  lastname: z.string(),
  email: z.string(),
  has_profile_image: z.boolean(),
  has_signature: z.boolean(),
  department: z.string().nullable(),
  phone_number: z.string(),
  gender: z.enum(GenderType),
  age: z.number(),
  address: z.object({
    street: z.string().nullable(),
    barangay: z.string().nullable(),
    city: z.string().nullable(),
    province: z.string().nullable(),
  }),
  role_type: z.enum(RoleType),
  profile_complete: z.boolean(),
});

export const PORTAL_PROFILE_MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const PORTAL_PROFILE_MAX_SIGNATURE_BYTES = 2 * 1024 * 1024;

export const PORTAL_PROFILE_ALLOWED_IMAGE_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;
