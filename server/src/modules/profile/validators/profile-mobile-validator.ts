import { z } from 'zod';
import {
  MOBILE_ROLE_TYPES,
  MOBILE_SIGN_IN_ROLE_TYPES,
} from '../../../shared/constants/mobile-role-types';
import { PhoneNumberSchema } from '../../../shared/validators/phone-number-validator';
import {
  AuthProvider,
  GenderType,
  InterestCode,
  RoleType,
  UserRequestStatus,
} from '../../../infastructures/prisma/common/client';

export const MOBILE_PROFILE_ROLE_TYPES = MOBILE_ROLE_TYPES;

/** App roles plus staff using the Volunteer side. */
export const MOBILE_PROFILE_ACCESS_ROLE_TYPES = MOBILE_SIGN_IN_ROLE_TYPES;

/** The role switcher is local, so the app names the side; completion and section use it. Default: registered role. */
export const MobileProfileRoleQuerySchema = z.object({
  role: z.enum(MOBILE_PROFILE_ROLE_TYPES).optional(),
});

const AddressSchema = z.object({
  street: z.string().nullable(),
  barangay: z.string().nullable(),
  city: z.string().nullable(),
  province: z.string().nullable(),
  /** For accounts without split fields. */
  full: z.string(),
});

export const VolunteerProfileSectionSchema = z.object({
  school: z
    .object({
      id_number: z.string(),
      department: z.string(),
      major: z.string(),
      year_level: z.string(),
      graduation_year: z.number(),
    })
    .nullable(),
  interests: z.array(z.enum(InterestCode)),
  /** Null unless OTHERS is picked. */
  other_interest: z.string().nullable(),
  /** Opened via role-access approval; no school record, so the app hides it. */
  access_granted_by_director: z.boolean(),
  /** Null for school volunteers; no school record, so the app hides it. */
  partner_barangay: z.string().nullable(),
  service_hours: z.number(),
  activities_completed: z.number(),
  activities_registered: z.number(),
  /** All-time leaderboard points. */
  ranking_points: z.number().int(),
});

export const DonorProfileSectionSchema = z.object({
  sign_in_providers: z.array(z.enum(AuthProvider)),
  has_password: z.boolean(),
});

/** The picker tops out at "6+". */
export const MOBILE_PROFILE_MAX_HOUSEHOLD_SIZE = 50;

/** Empty: ID-less registration, nothing role-specific. Household size is top-level since any account can edit this side. */
export const BeneficiaryProfileSectionSchema = z.object({});

/** Newest first. */
export const ResidencyDocumentSchema = z.object({
  residency_document_id: z.string(),
  file_name: z.string(),
  mime_type: z.string(),
  size_bytes: z.number(),
  /** OCR result at upload. */
  extracted_address: z.string(),
  uploaded_at: z.string(),
});

/** From the stored record; `missing` names outstanding steps. */
export const ProfileCompletionSchema = z.object({
  percent: z.number(),
  complete: z.boolean(),
  completed_steps: z.number(),
  total_steps: z.number(),
  missing: z.array(z.string()),
  /** Done but awaiting approval; also in `missing`, shown as "under review". */
  pending_review: z.array(z.string()),
});

/** Null when never uploaded from the profile. */
export const ResidencyReviewSchema = z.object({
  status: z.enum(UserRequestStatus),
  /** Set on rejection. */
  rejection_reason: z.string().nullable(),
  /** Upload under (or last given) review. */
  submitted_at: z.string(),
  decided_at: z.string().nullable(),
});

export const MobileProfileResponseSchema = z.object({
  user_id: z.string(),
  /** Registered role; a portal role for staff. */
  role_type: z.enum(MOBILE_PROFILE_ACCESS_ROLE_TYPES),
  /** `?role=` or else `role_type`. */
  profiling_role: z.enum(MOBILE_PROFILE_ROLE_TYPES),
  firstname: z.string(),
  middle_name: z.string().nullable(),
  lastname: z.string(),
  email: z.string(),
  phone_number: z.string(),
  gender: z.enum(GenderType),
  age: z.number(),
  address: AddressSchema,
  /** Beneficiary side; top-level since any mobile account can edit that side. */
  household_size: z.number().int().nullable(),
  /** Newest first. */
  residency_documents: z.array(ResidencyDocumentSchema),
  residency_review: ResidencyReviewSchema.nullable(),
  has_profile_image: z.boolean(),
  /** Provider-owned identities can't change email/password in CARES. */
  sign_in_providers: z.array(z.enum(AuthProvider)),
  has_password: z.boolean(),
  member_since: z.string(),
  /** Opened without a role-access request (student beneficiary's Volunteer side). */
  unlocked_roles: z.array(z.enum(RoleType)),
  profile_completion: ProfileCompletionSchema,
  volunteer: VolunteerProfileSectionSchema.nullable(),
  donor: DonorProfileSectionSchema.nullable(),
  beneficiary: BeneficiaryProfileSectionSchema.nullable(),
});

/** No email/password (separate flows). Multipart for the avatar, so `age` is coerced. */
export const UpdateMobileProfileSchema = z
  .object({
    firstname: z.string().trim().min(1, 'First name is required').max(80),
    middle_name: z.string().trim().max(80).optional().default(''),
    lastname: z.string().trim().min(1, 'Last name is required').max(80),
    phone_number: PhoneNumberSchema,
    gender: z.enum(GenderType),
    age: z.coerce
      .number()
      .int('Age must be a whole number')
      .min(1, 'Age must be at least 1')
      .max(150, 'Age must be 150 or below'),
    /** Optional: the beneficiary form changes it via `POST me/mobile/residency`. */
    current_address: z
      .string()
      .trim()
      .min(1, 'Address is required')
      .max(300)
      .optional(),
    /** Multipart string; empty clears. */
    household_size: z.preprocess(
      (value) => (value === '' || value === undefined ? undefined : value),
      z.coerce
        .number()
        .int('Household size must be a whole number')
        .min(1, 'Household size must be at least 1')
        .max(
          MOBILE_PROFILE_MAX_HOUSEHOLD_SIZE,
          `Household size must be ${MOBILE_PROFILE_MAX_HOUSEHOLD_SIZE} or below`,
        )
        .optional(),
    ),
  })
  .strict();

export const MOBILE_PROFILE_MAX_AVATAR_BYTES = 5 * 1024 * 1024;

/** Larger than an avatar for scans. */
export const MOBILE_PROFILE_MAX_RESIDENCY_BYTES = 10 * 1024 * 1024;

export const MOBILE_PROFILE_ALLOWED_RESIDENCY_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const;

export const MOBILE_PROFILE_ALLOWED_AVATAR_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

/** School details come from the session's OCR, never the body. */
export const ApplySchoolRecordSchema = z
  .object({
    registrationId: z.string().trim().uuid('Invalid registration session'),
  })
  .strict();
