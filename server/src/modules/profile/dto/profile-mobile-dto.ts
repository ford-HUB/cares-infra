import { z } from 'zod';
import {
  BeneficiaryProfileSectionSchema,
  ProfileCompletionSchema,
  DonorProfileSectionSchema,
  MobileProfileResponseSchema,
  MobileProfileRoleQuerySchema,
  ResidencyDocumentSchema,
  UpdateMobileProfileSchema,
  ApplySchoolRecordSchema,
  VolunteerProfileSectionSchema,
} from '../validators/profile-mobile-validator';

export type MobileProfileDto = z.infer<typeof MobileProfileResponseSchema>;
export type ProfileCompletionDto = z.infer<typeof ProfileCompletionSchema>;
export type VolunteerProfileSectionDto = z.infer<
  typeof VolunteerProfileSectionSchema
>;
export type DonorProfileSectionDto = z.infer<typeof DonorProfileSectionSchema>;
export type BeneficiaryProfileSectionDto = z.infer<
  typeof BeneficiaryProfileSectionSchema
>;
export type UpdateMobileProfileDto = z.infer<typeof UpdateMobileProfileSchema>;
export type MobileProfileRoleQueryDto = z.infer<
  typeof MobileProfileRoleQuerySchema
>;
export type ApplySchoolRecordDto = z.infer<typeof ApplySchoolRecordSchema>;
export type ResidencyDocumentDto = z.infer<typeof ResidencyDocumentSchema>;

/** What the OCR service reads off a proof-of-residency upload. */
export interface ResidencyOcrResultDto {
  address: string;
  rawText: string;
  pages: number;
}
