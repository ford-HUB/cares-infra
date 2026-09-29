import { z } from 'zod';
import {
  CreateDonationPaymentSchema,
  CreateGoodsDonationSchema,
  DonationListResponseSchema,
  DonationPaymentListResponseSchema,
  DonationPaymentResponseSchema,
  DonationResponseSchema,
  DonationTrailEntrySchema,
  UpdateGoodsDonationSchema,
} from '../validators/donations-mobile-validator';

export type CreateDonationPaymentDto = z.infer<
  typeof CreateDonationPaymentSchema
>;
export type DonationPaymentDto = z.infer<typeof DonationPaymentResponseSchema>;
export type DonationPaymentListDto = z.infer<
  typeof DonationPaymentListResponseSchema
>;
export type CreateGoodsDonationDto = z.infer<typeof CreateGoodsDonationSchema>;
export type UpdateGoodsDonationDto = z.infer<typeof UpdateGoodsDonationSchema>;
export type DonationTrailEntryDto = z.infer<typeof DonationTrailEntrySchema>;
export type DonationDto = z.infer<typeof DonationResponseSchema>;
export type DonationListDto = z.infer<typeof DonationListResponseSchema>;
