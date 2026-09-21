import { z } from 'zod';
import {
  DonationKind,
  DonationStatus,
} from '../../../infastructures/prisma/common/client';
import { DonationSchema } from './donations-mobile-validator';

/** Rungs a portal account may move a donation to. CANCELLED belongs to the donor. */
export const PORTAL_DONATION_STATUSES = [
  DonationStatus.PLEDGED,
  DonationStatus.AWAITING_PICKUP,
  DonationStatus.VERIFYING,
  DonationStatus.CONFIRMED,
  DonationStatus.DECLINED,
] as const;

export const DONATION_NOTE_MAX = 500;

export const ChangeDonationStatusSchema = z
  .object({
    status: z.enum(PORTAL_DONATION_STATUSES),
    note: z.string().trim().max(DONATION_NOTE_MAX).optional(),
  })
  .strict();

export const DonationsSiteQuerySchema = z
  .object({
    status: z.enum(DonationStatus).optional(),
    kind: z.enum(DonationKind).optional(),
  })
  .strict();

/** A ledger row with the donor beside it — the tracking table's row. */
export const SiteDonationSchema = DonationSchema.extend({
  donor: z.object({
    user_id: z.string(),
    name: z.string(),
    email: z.string(),
    phone: z.string().nullable(),
  }),
});

export const SiteDonationResponseSchema = SiteDonationSchema;

export const SiteDonationListResponseSchema = z.object({
  items: z.array(SiteDonationSchema),
});
