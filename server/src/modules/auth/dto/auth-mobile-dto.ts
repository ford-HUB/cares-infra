import { z } from 'zod';
import {
  BeneficiaryType,
  RoleType,
} from '../../../infastructures/prisma/common/client';
import {
  CreateUserSchema,
  ForgotPasswordResponseSchema,
  ForgotPasswordSchema,
  ResetPasswordResponseSchema,
  ResetPasswordSchema,
  VerifyResetOtpResponseSchema,
  VerifyResetOtpSchema,
  ExtractIdResponseSchema,
  PARTNER_BARANGAYS,
  ExtractIdSchema,
  IdOcrResultSchema,
  LoginResponseSchema,
  LoginSchema,
  RegisterFromSessionSchema,
  RegisterUserResponseSchema,
  RegistrationIdSchema,
  RegistrationStepSchema,
  ManualVolunteerTypeSchema,
  RegistrationDocumentResponseSchema,
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
export type PartnerBarangay = (typeof PARTNER_BARANGAYS)[number];
/** Includes the chosen partner barangay for reviewed partner-barangay sign-ups. */
export type NewUserAccountDto = CreateUserDto & {
  partner_barangay?: PartnerBarangay;
  /** Beneficiaries only; from the session, never the client. */
  beneficiary_type?: BeneficiaryType;
};
export type CreateUserAccountDto = CreateUserDto['account'];
export type UserSchoolInfoDto = CreateUserDto['school_info'];
export type BiometricDto = CreateUserDto['biometric'];
export type DepartmentDto = UserSchoolInfoDto['department'];
export type MajorDto = UserSchoolInfoDto['major'];
export type YearLevelDto = UserSchoolInfoDto['year_level'];

export type RegistrationIdDto = z.infer<typeof RegistrationIdSchema>;
export type ExtractIdDto = z.infer<typeof ExtractIdSchema>;
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
export type RegistrationDocumentResponseDto = z.infer<
  typeof RegistrationDocumentResponseSchema
>;
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

/** Redis-only; never serialized. */
export interface RegistrationSessionDto {
  /** Null for ID-less (beneficiary) sessions. */
  idFrontImageUrl: string | null;
  idBackImageUrl: string | null;
  /** Set for ID-less and alumni sessions, which are locked to their starting role. */
  roleType: RoleType | null;
  /**
   * Absent for a UCLM school ID. `alumni` / `partner_barangay` skip the classifier, face
   * verification and OCR; `manual` is the fallback for an unrecognised photo (typed
   * details, no face scan). All wait for director approval.
   */
  idKind?: 'school' | 'alumni' | 'partner_barangay' | 'manual';
  /** `manual` sessions only. */
  manualVolunteerType?: ManualRegistrationVolunteerType;
  selfieUrl: string | null;
  faceMatch: boolean | null;
  faceSimilarity: number | null;
  selfieEmbedding: number[] | null;
  ocrData: IdOcrResultDto | null;
  /** Already in S3; copied onto the director's review request. */
  supportingDocument?: RegistrationDocumentDto | null;
  step: RegistrationStep;
  createdAt: number;
}

export type ManualRegistrationVolunteerType = z.infer<
  typeof ManualVolunteerTypeSchema
>;

export interface RegistrationDocumentDto {
  url: string;
  name: string;
  mime: string;
  sizeBytes: number;
}
