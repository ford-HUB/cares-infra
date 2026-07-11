import { z } from 'zod';
import { GenderType } from '../../../infastructures/prisma/common/client';

export const UpdatePortalProfileSchema = z.object({
    firstname: z.string().trim().min(1, 'First name is required').max(80),
    lastname: z.string().trim().min(1, 'Last name is required').max(80),
    phone_number: z.string().trim().min(7, 'Phone number is required').max(25),
    gender: z.nativeEnum(GenderType),
    department: z.string().trim().max(120).optional(),
    address_street: z.string().trim().min(1, 'Street is required').max(200),
    address_barangay: z.string().trim().min(1, 'Barangay is required').max(120),
    address_city: z.string().trim().min(1, 'City is required').max(120),
    address_province: z.string().trim().min(1, 'Province is required').max(120),
}).strict();

export type UpdatePortalProfileInput = z.infer<typeof UpdatePortalProfileSchema>;

export const PORTAL_PROFILE_MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const PORTAL_PROFILE_MAX_SIGNATURE_BYTES = 2 * 1024 * 1024;

export const PORTAL_PROFILE_ALLOWED_IMAGE_MIMES = [
    'image/jpeg',
    'image/png',
    'image/webp',
] as const;
