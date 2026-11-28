import { z } from 'zod';
import { DonationPaymentMethod } from '../../../infastructures/prisma/common/client';
import { MOBILE_ROLE_TYPES } from '../../../shared/constants/mobile-role-types';

/** Same accounts as `DONATIONS_MOBILE_ROLE_TYPES`. */
export const PAYMENTS_MOBILE_ROLE_TYPES = MOBILE_ROLE_TYPES;

/** Includes the receiving account (shown on confirmation) and the limits the app enforces. */
export const AvailablePaymentMethodSchema = z.object({
  method: z.enum(DonationPaymentMethod),
  label: z.string(),
  description: z.string(),
  account_name: z.string().nullable(),
  account_number: z.string().nullable(),
  min_amount: z.number(),
  max_amount: z.number(),
});

export const AvailablePaymentMethodsResponseSchema = z.object({
  /** Empty while payments are off or no key is saved. */
  items: z.array(AvailablePaymentMethodSchema),
  /** False shows goods donations only. */
  accepting_payments: z.boolean(),
  support_email: z.string().nullable(),
  support_contact: z.string().nullable(),
});
