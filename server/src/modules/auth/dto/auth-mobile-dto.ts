import { z } from 'zod';
import { RoleType } from '../../../infastructures/prisma/common/client';
import {
  CreateUserSchema,
  ForgotPasswordResponseSchema,
  ForgotPasswordSchema,
  ResetPasswordResponseSchema,
  ResetPasswordSchema,
  VerifyResetOtpResponseSchema,
  VerifyResetOtpSchema,
  ExtractIdResponseSchema,
  IdOcrResultSchema,
  LoginResponseSchema,
  LoginSchema,
  RegisterFromSessionSchema,
  RegisterUserResponseSchema,
  RegistrationIdSchema,
  RegistrationStepSchema,
  SendVerificationResponseSchema,
  SendVerificationSchema,
  StartSessionResponseSchema,
  StartSessionSchema,
  UploadIdResponseSchema,
  VerificationStatusResponseSchema,
  VerifyFaceResponseSchema,
  VerifyOtpResponseSchema,
  VerifyOtpSchema,
} from '../validators/auth-mobile-validator';

export type CreateUserDto = z.infer<typeof CreateUserSchema>;
export type CreateUserAccountDto = CreateUserDto['account'];
export type UserSchoolInfoDto = CreateUserDto['school_info'];
export type BiometricDto = CreateUserDto['biometric'];
export type DepartmentDto = UserSchoolInfoDto['department'];
export type MajorDto = UserSchoolInfoDto['major'];
export type YearLevelDto = UserSchoolInfoDto['year_level'];

export type RegistrationIdDto = z.infer<typeof RegistrationIdSchema>;
export type StartSessionDto = z.infer<typeof StartSessionSchema>;
export type RegisterFromSessionDto = z.infer<typeof RegisterFromSessionSchema>;
export type SendVerificationDto = z.infer<typeof SendVerificationSchema>;
export type VerifyOtpDto = z.infer<typeof VerifyOtpSchema>;
export type LoginDto = z.infer<typeof LoginSchema>;
export type ForgotPasswordDto = z.infer<typeof ForgotPasswordSchema>;
export type VerifyResetOtpDto = z.infer<typeof VerifyResetOtpSchema>;
export type ResetPasswordDto = z.infer<typeof ResetPasswordSchema>;

export type RegistrationStep = z.infer<typeof RegistrationStepSchema>;
export type IdOcrResultDto = z.infer<typeof IdOcrResultSchema>;
export type RegisterUserResponseDto = z.infer<
  typeof RegisterUserResponseSchema
>;
export type LoginResponseDto = z.infer<typeof LoginResponseSchema>;
export type UploadIdResponseDto = z.infer<typeof UploadIdResponseSchema>;
export type StartSessionResponseDto = z.infer<
  typeof StartSessionResponseSchema
>;
export type VerifyFaceResponseDto = z.infer<typeof VerifyFaceResponseSchema>;
export type ExtractIdResponseDto = z.infer<typeof ExtractIdResponseSchema>;
export type SendVerificationResponseDto = z.infer<
  typeof SendVerificationResponseSchema
>;
export type VerificationStatusResponseDto = z.infer<
  typeof VerificationStatusResponseSchema
>;
export type VerifyOtpResponseDto = z.infer<typeof VerifyOtpResponseSchema>;
export type ForgotPasswordResponseDto = z.infer<
  typeof ForgotPasswordResponseSchema
>;
export type VerifyResetOtpResponseDto = z.infer<
  typeof VerifyResetOtpResponseSchema
>;
export type ResetPasswordResponseDto = z.infer<
  typeof ResetPasswordResponseSchema
>;

/** Redis-only registration state — never serialized to a client, so it has no schema. */
export interface RegistrationSessionDto {
  /** Null for ID-less sessions (beneficiaries register without uploading an ID). */
  idFrontImageUrl: string | null;
  idBackImageUrl: string | null;
  /** Set only for ID-less sessions, which are locked to the role that started them. */
  roleType: RoleType | null;
  selfieUrl: string | null;
  faceMatch: boolean | null;
  faceSimilarity: number | null;
  selfieEmbedding: number[] | null;
  ocrData: IdOcrResultDto | null;
  step: RegistrationStep;
  createdAt: number;
}
