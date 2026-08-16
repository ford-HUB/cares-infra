import { z } from 'zod';
import {
  CreateUserSchema,
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
export type RegisterFromSessionDto = z.infer<typeof RegisterFromSessionSchema>;
export type SendVerificationDto = z.infer<typeof SendVerificationSchema>;
export type VerifyOtpDto = z.infer<typeof VerifyOtpSchema>;
export type LoginDto = z.infer<typeof LoginSchema>;

export type RegistrationStep = z.infer<typeof RegistrationStepSchema>;
export type IdOcrResultDto = z.infer<typeof IdOcrResultSchema>;
export type RegisterUserResponseDto = z.infer<
  typeof RegisterUserResponseSchema
>;
export type LoginResponseDto = z.infer<typeof LoginResponseSchema>;
export type UploadIdResponseDto = z.infer<typeof UploadIdResponseSchema>;
export type VerifyFaceResponseDto = z.infer<typeof VerifyFaceResponseSchema>;
export type ExtractIdResponseDto = z.infer<typeof ExtractIdResponseSchema>;
export type SendVerificationResponseDto = z.infer<
  typeof SendVerificationResponseSchema
>;
export type VerificationStatusResponseDto = z.infer<
  typeof VerificationStatusResponseSchema
>;
export type VerifyOtpResponseDto = z.infer<typeof VerifyOtpResponseSchema>;

/** Redis-only registration state — never serialized to a client, so it has no schema. */
export interface RegistrationSessionDto {
  idFrontImageUrl: string;
  idBackImageUrl: string;
  selfieUrl: string | null;
  faceMatch: boolean | null;
  faceSimilarity: number | null;
  selfieEmbedding: number[] | null;
  ocrData: IdOcrResultDto | null;
  step: RegistrationStep;
  createdAt: number;
}
