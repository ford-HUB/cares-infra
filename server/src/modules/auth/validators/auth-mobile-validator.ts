import { z } from 'zod';
import { PhoneNumberSchema } from '../../../shared/validators/phone-number-validator';
import {
  EmbeddingType,
  GenderType,
  RoleType,
} from '../../../infastructures/prisma/common/client';

export const CreateUserSchema = z
  .object({
    firstname: z.string().trim().min(1),
    lastname: z.string().trim().min(1),
    middle_name: z.string().trim().optional().default(''),

    role_type: z.enum(RoleType),
    gender: z.enum(GenderType),

    age: z.number().int().min(1).max(150),
    current_address: z.string().trim().min(1),
    phone_number: PhoneNumberSchema,
    avatar: z.string().trim().url().optional(),

    account: z.object({
      email: z.string().trim().email(),
      password: z.string().min(8),
    }),

    school_info: z.object({
      id_number: z.string().trim().min(1),
      graduation_year: z.number().int().min(1900).max(3000),
      graduation_month: z.number().int().min(1).max(12),
      graduation_day: z.number().int().min(1).max(31),
      department: z.object({
        name: z.string().trim().min(1),
      }),
      major: z.object({
        name: z.string().trim().min(1),
      }),
      year_level: z.object({
        name: z.string().trim().min(1),
      }),
    }),

    // Absent for beneficiaries: they register without an ID or a face scan, so
    // there is nothing to enrol.
    biometric: z
      .object({
        face_url: z.string().trim().url(),
        embedding: z.array(z.number().finite()).length(512),
        embedding_type: z.enum(EmbeddingType),
        isActive: z.boolean().default(true),
      })
      .optional(),
  })
  .strict();

export const RegistrationIdSchema = z
  .object({
    registrationId: z.uuid(),
  })
  .strict();

export const StartSessionSchema = z
  .object({
    roleType: z.enum(RoleType),
  })
  .strict();

export const RegisterFromSessionSchema = CreateUserSchema.omit({
  biometric: true,
})
  .extend({
    registrationId: z.uuid(),
  })
  .strict();

export const SendVerificationSchema = z
  .object({
    email: z.string().trim().email(),
    // Optional so the availability check runs before a code is ever mailed —
    // a taken phone number or ID number is caught on the form, not after OTP.
    phone_number: PhoneNumberSchema.optional(),
    id_number: z.string().trim().min(1).optional(),
  })
  .strict();

export const VerifyOtpSchema = z
  .object({
    email: z.string().trim().email(),
    otp: z
      .string()
      .trim()
      .length(6)
      .regex(/^\d{6}$/),
  })
  .strict();

export const ForgotPasswordSchema = z
  .object({
    email: z
      .string()
      .trim()
      .email()
      .transform((value) => value.toLowerCase()),
  })
  .strict();

export const VerifyResetOtpSchema = z
  .object({
    email: z
      .string()
      .trim()
      .email()
      .transform((value) => value.toLowerCase()),
    otp: z
      .string()
      .trim()
      .length(6)
      .regex(/^\d{6}$/),
  })
  .strict();

export const ResetPasswordSchema = z
  .object({
    email: z
      .string()
      .trim()
      .email()
      .transform((value) => value.toLowerCase()),
    /** Handed out by `verify-reset-otp`; the OTP itself is never replayed here. */
    resetToken: z.uuid(),
    newPassword: z.string().min(8),
  })
  .strict();

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

export const RegistrationStepSchema = z.enum([
  'session_started',
  'id_uploaded',
  'face_verified',
  'ocr_completed',
]);

export const RegisterUserResponseSchema = z.object({
  user_id: z.string(),
  account_id: z.string(),
  // Null for a beneficiary — no face is enrolled on an ID-less registration.
  user_biometric_id: z.string().nullable(),
});

export const LoginResponseSchema = z.object({
  user_id: z.string(),
  role_type: z.enum(RoleType),
  email: z.string(),
  firstname: z.string(),
  has_interests: z.boolean(),
  access_token: z.string(),
});

export const UploadIdResponseSchema = z.object({
  registrationId: z.string(),
});

export const StartSessionResponseSchema = z.object({
  registrationId: z.string(),
  step: RegistrationStepSchema,
});

export const VerifyFaceResponseSchema = z.object({
  registrationId: z.string(),
  match: z.boolean(),
  similarity: z.number(),
  threshold: z.number(),
  step: RegistrationStepSchema,
  message: z.string(),
});

export const IdOcrResultSchema = z.object({
  firstname: z.string(),
  lastname: z.string(),
  middleName: z.string(),
  gender: z.string(),
  age: z.number(),
  currentAddress: z.string(),
  phoneNumber: z.string(),
  idNumber: z.string(),
  departmentName: z.string(),
  majorName: z.string(),
  yearLevelName: z.string(),
  graduationYear: z.number(),
  graduationMonth: z.number(),
  graduationDay: z.number(),
  volunteerType: z.string(),
  rawTextFront: z.string().optional(),
  rawTextBack: z.string().optional(),
});

export const ExtractIdResponseSchema = z.object({
  registrationId: z.string(),
  step: RegistrationStepSchema,
  ocrData: IdOcrResultSchema,
});

export const SendVerificationResponseSchema = z.object({
  email: z.string(),
  sent: z.boolean(),
  reused: z.boolean(),
  verified: z.boolean(),
  expiresInSeconds: z.number(),
});

export const VerificationStatusResponseSchema = z.object({
  email: z.string(),
  hasActiveCode: z.boolean(),
  verified: z.boolean(),
  expiresInSeconds: z.number(),
});

export const VerifyOtpResponseSchema = z.object({
  email: z.string(),
  verified: z.boolean(),
  expiresInSeconds: z.number(),
});

export const ForgotPasswordResponseSchema = z.object({
  email: z.string(),
  sent: z.boolean(),
  reused: z.boolean(),
  expiresInSeconds: z.number(),
});

export const VerifyResetOtpResponseSchema = z.object({
  email: z.string(),
  resetToken: z.string(),
  expiresInSeconds: z.number(),
});

export const ResetPasswordResponseSchema = z.object({
  email: z.string(),
  updated: z.boolean(),
});
