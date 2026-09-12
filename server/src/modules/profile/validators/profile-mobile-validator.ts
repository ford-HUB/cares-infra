import { z } from 'zod';
import { PhoneNumberSchema } from '../../../shared/validators/phone-number-validator';
import {
  AuthProvider,
  GenderType,
  InterestCode,
  RoleType,
} from '../../../infastructures/prisma/common/client';

/** Roles the Flutter app signs in as — the only callers of the mobile profile. */
export const MOBILE_PROFILE_ROLE_TYPES = [
  RoleType.VOLUNTEER,
  RoleType.DONOR,
  RoleType.BENEFICIARY,
] as const;

/**
 * `?role=` on the mobile profile routes. The app's role switcher is local —
 * one account can open the volunteer, donor and beneficiary dashboards — so
 * the app names the side it is showing and the profile is scoped to it:
 * `profile_completion` and the role section are computed for that role, not
 * the one the account registered with. Omitted → the registered role.
 */
export const MobileProfileRoleQuerySchema = z.object({
  role: z.enum(MOBILE_PROFILE_ROLE_TYPES).optional(),
});

const AddressSchema = z.object({
  street: z.string().nullable(),
  barangay: z.string().nullable(),
  city: z.string().nullable(),
  province: z.string().nullable(),
  /** Free-text address captured at registration, kept for accounts without the split fields. */
  full: z.string(),
});

/** Volunteer-only section: school record, interests, verification and service stats. */
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
  service_hours: z.number(),
  activities_completed: z.number(),
  activities_registered: z.number(),
});

/** Donor-only section: how they sign in and where to reach them. */
export const DonorProfileSectionSchema = z.object({
  sign_in_providers: z.array(z.enum(AuthProvider)),
  has_password: z.boolean(),
});

/** Largest household the profile form accepts — the picker tops out at "6+". */
export const MOBILE_PROFILE_MAX_HOUSEHOLD_SIZE = 50;

/**
 * Beneficiary-only section. Beneficiaries register ID-less (the email OTP
 * vouches for them), so there is nothing role-specific on file — the empty
 * object still tells the app which role the record belongs to. (Household
 * size sits on the top-level profile: the app's role switcher is local, so a
 * volunteer-registered account can be editing its beneficiary side.)
 */
export const BeneficiaryProfileSectionSchema = z.object({});

/** A proof-of-residency file on record, newest first in the profile. */
export const ResidencyDocumentSchema = z.object({
  residency_document_id: z.string(),
  file_name: z.string(),
  mime_type: z.string(),
  size_bytes: z.number(),
  /** The address OCR read off this file when it was uploaded. */
  extracted_address: z.string(),
  /** ISO timestamp of the upload. */
  uploaded_at: z.string(),
});

/**
 * How much of the person's profile is actually on file, computed from the
 * stored record — not from anything the app keeps locally. `missing` names the
 * steps still outstanding so the app can point at them.
 */
export const ProfileCompletionSchema = z.object({
  percent: z.number(),
  complete: z.boolean(),
  completed_steps: z.number(),
  total_steps: z.number(),
  missing: z.array(z.string()),
});

export const MobileProfileResponseSchema = z.object({
  user_id: z.string(),
  /** The role the account registered with. */
  role_type: z.enum(MOBILE_PROFILE_ROLE_TYPES),
  /**
   * The role `profile_completion` and the section below are scoped to — the
   * `?role=` the app asked for, else `role_type`. The app files the profile
   * under this role account.
   */
  profiling_role: z.enum(MOBILE_PROFILE_ROLE_TYPES),
  firstname: z.string(),
  middle_name: z.string().nullable(),
  lastname: z.string(),
  email: z.string(),
  phone_number: z.string(),
  gender: z.enum(GenderType),
  age: z.number(),
  address: AddressSchema,
  /**
   * How many people the assistance has to cover. Meaningful on the beneficiary
   * side; null until set. Top-level rather than in `beneficiary` because the
   * app can edit the beneficiary side of any mobile account.
   */
  household_size: z.number().int().nullable(),
  /** Proof-of-residency uploads, newest first. Empty for accounts that never changed address this way. */
  residency_documents: z.array(ResidencyDocumentSchema),
  has_profile_image: z.boolean(),
  /**
   * How the account signs in, for every role. The app disables the email and
   * password controls when a provider owns the identity — those change through
   * Google or Facebook, not CARES. Mirrors the donor section's copy, which stays
   * for the donor account card.
   */
  sign_in_providers: z.array(z.enum(AuthProvider)),
  has_password: z.boolean(),
  /** ISO timestamp of the account's creation — the "member since" date. */
  member_since: z.string(),
  profile_completion: ProfileCompletionSchema,
  volunteer: VolunteerProfileSectionSchema.nullable(),
  donor: DonorProfileSectionSchema.nullable(),
  beneficiary: BeneficiaryProfileSectionSchema.nullable(),
});

/**
 * `PUT /v1/profile/me/mobile` — the editable part of the record. Email and
 * password are deliberately absent: those change through the account flows,
 * not the profile form. Arrives as multipart so an avatar can ride along, which
 * is why `age` is coerced from its string form.
 */
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
    /**
     * Free-text address, the same shape registration captures. Optional: the
     * beneficiary form locks the address and changes it through
     * `POST me/mobile/residency` instead, so it sends nothing here and the
     * stored value is left alone.
     */
    current_address: z
      .string()
      .trim()
      .min(1, 'Address is required')
      .max(300)
      .optional(),
    /**
     * Multipart carries it as a string, and an empty string clears the value.
     */
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

/** Residency papers are photos or scans — allow a larger file than an avatar. */
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

/**
 * `POST /v1/profile/me/mobile/school-record` — points at a registration
 * session that has been through ID upload, face match and OCR. The school
 * details come from the session's OCR result, never from the body, so the
 * department cannot be typed in.
 */
export const ApplySchoolRecordSchema = z
  .object({
    registrationId: z.string().trim().uuid('Invalid registration session'),
  })
  .strict();
