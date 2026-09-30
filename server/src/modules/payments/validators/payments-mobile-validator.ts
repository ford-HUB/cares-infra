import { z } from 'zod';
import {
  DonationPaymentMethod,
  RoleType,
} from '../../../infastructures/prisma/common/client';

/** Only donors are offered a checkout, so only they may ask what it accepts. */
export const PAYMENTS_MOBILE_ROLE_TYPES = [RoleType.DONOR] as const;

/**
 * One channel as a donor sees it: the label and copy the director settled on, the
 * account the money lands in (shown on the confirmation so the donor knows where it
 * went), and the limits the app enforces before it even opens a checkout.
 */
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
  /** Empty while the director has switched payments off or saved no key yet. */
  items: z.array(AvailablePaymentMethodSchema),
  /** False when nothing can be paid right now — the app shows goods donations only. */
  accepting_payments: z.boolean(),
  /** Who the donor contacts about a payment that went wrong, when CARES gave one. */
  support_email: z.string().nullable(),
  support_contact: z.string().nullable(),
});
