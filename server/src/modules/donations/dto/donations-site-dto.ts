import { z } from 'zod';
import {
  ChangeDonationStatusSchema,
  DonationsSiteQuerySchema,
  SiteDonationListResponseSchema,
  SiteDonationResponseSchema,
} from '../validators/donations-site-validator';

export type ChangeDonationStatusDto = z.infer<
  typeof ChangeDonationStatusSchema
>;
export type DonationsSiteQueryDto = z.infer<typeof DonationsSiteQuerySchema>;
export type SiteDonationDto = z.infer<typeof SiteDonationResponseSchema>;
export type SiteDonationListDto = z.infer<
  typeof SiteDonationListResponseSchema
>;
