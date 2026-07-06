import { z } from "zod";
import { EmbeddingType, GenderType, RoleType } from "../../infastructures/prisma/common/client";

const enumFromConst = <T extends Record<string, string>>(e: T) => {
  const values = Object.values(e);
  return z.enum(values as [string, ...string[]]);
};

export const CreateUserSchema = z
  .object({
    firstname: z.string().trim().min(1),
    lastname: z.string().trim().min(1),
    middle_name: z.string().trim().optional().default(""),

    role_type: enumFromConst(RoleType),
    gender: enumFromConst(GenderType),

    age: z.number().int().min(1).max(150),
    current_address: z.string().trim().min(1),
    phone_number: z.string().trim().min(7).max(25),
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

    biometric: z.object({
      face_url: z.string().trim().url(),
      embedding: z.array(z.number().finite()).length(512),
      embedding_type: enumFromConst(EmbeddingType),
      isActive: z.boolean().default(true),
    }),
  })
  .strict();

export type CreateUserInput = z.infer<typeof CreateUserSchema>;

export const RegistrationIdSchema = z
  .object({
    registrationId: z.uuid(),
  })
  .strict();

export const RegisterFromSessionSchema = CreateUserSchema.omit({ biometric: true })
  .extend({
    registrationId: z.uuid(),
  })
  .strict();

export type RegisterFromSessionInput = z.infer<typeof RegisterFromSessionSchema>;

export const SendVerificationSchema = z
  .object({
    email: z.string().trim().email(),
  })
  .strict();

export const VerifyOtpSchema = z
  .object({
    email: z.string().trim().email(),
    otp: z.string().trim().length(6).regex(/^\d{6}$/),
  })
  .strict();

export const LoginSchema = z
  .object({
    email: z.string().trim().email().transform((value) => value.toLowerCase()),
    password: z.string().min(1),
  })
  .strict();

export type LoginInput = z.infer<typeof LoginSchema>;
