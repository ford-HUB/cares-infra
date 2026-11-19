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
/**
 * What the repository writes for a new account: the sign-up fields plus, for a
 * reviewed partner-barangay sign-up, the partner barangay the volunteer picked.
 */
export type NewUserAccountDto = CreateUserDto & {
  partner_barangay?: PartnerBarangay;
  /** Beneficiaries only — set from the registration session, never the client. */
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

/** Redis-only registration state — never serialized to a client, so it has no schema. */
export interface RegistrationSessionDto {
  /** Null for ID-less sessions (beneficiaries register without uploading an ID). */
  idFrontImageUrl: string | null;
  idBackImageUrl: string | null;
  /**
   * Set for ID-less sessions and alumni sessions, which are locked to the role
   * that started them.
   */
  roleType: RoleType | null;
  /**
   * `alumni` when the ID is an alumni ID, `partner_barangay` when it is the valid
   * ID of a partner-barangay volunteer: either skips the student-ID classifier,
   * face verification and OCR, and the sign-up waits for a director's approval.
   * Absent for a UCLM school ID.
   *
   * `manual` when a volunteer registrant chose manual registration because
   * the app could not recognize their ID photo: the ID skipped the automatic ID
   * checks, there is no face scan or OCR, the details are typed in, and the
   * sign-up waits for a director's approval (a MANUAL_REGISTRATION request).
   */
  idKind?: 'school' | 'alumni' | 'partner_barangay' | 'manual';
  /** `manual` sessions only — which volunteer sign-up fell back to manual. */
  manualVolunteerType?: ManualRegistrationVolunteerType;
  selfieUrl: string | null;
  faceMatch: boolean | null;
  faceSimilarity: number | null;
  selfieEmbedding: number[] | null;
  ocrData: IdOcrResultDto | null;
  /**
   * Beneficiary, alumni and partner-barangay sessions — the document from the
   * sign-up form, already in S3. Registration copies it onto the director's review request.
   */
  supportingDocument?: RegistrationDocumentDto | null;
  step: RegistrationStep;
  createdAt: number;
}

/** The volunteer sign-ups that can fall back to manual registration. */
export type ManualRegistrationVolunteerType = z.infer<
  typeof ManualVolunteerTypeSchema
>;

export interface RegistrationDocumentDto {
  url: string;
  name: string;
  mime: string;
  sizeBytes: number;
}
