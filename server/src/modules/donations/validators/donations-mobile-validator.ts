import { z } from 'zod';
import {
  DonationKind,
  DonationPaymentMethod,
  DonationPaymentStatus,
  DonationStatus,
} from '../../../infastructures/prisma/common/client';
import { GOODS_TYPE_IDS } from '../../../shared/constants/goods-types';
import { MOBILE_ROLE_TYPES } from '../../../shared/constants/mobile-role-types';
import { PhoneNumberSchema } from '../../../shared/validators/phone-number-validator';

/**
 * Accounts that can open the donor side of the app. The role switcher is local
 * (the donor side unlocks with no check), so a volunteer or beneficiary giving
 * from the donor side still carries the token they registered with. Portal
 * staff only ever get the volunteer side, so they stay out.
 */
export const DONATIONS_MOBILE_ROLE_TYPES = MOBILE_ROLE_TYPES;

/** Xendit enforces PHP 1 minimum on every channel; the cap keeps a typo from becoming a ₱1M charge. */
export const DONATION_MIN_AMOUNT = 1;
export const DONATION_MAX_AMOUNT = 500_000;

export const CreateDonationPaymentSchema = z
  .object({
    campaignId: z.string().trim().min(1, 'Campaign is required').max(120),
    campaignTitle: z
      .string()
      .trim()
      .min(1, 'Campaign title is required')
      .max(200),
    /** Present when the campaign is a director event with donations enabled. */
    eventId: z.number().int().positive().optional(),
    amount: z
      .number()
      .int('Amount must be whole pesos')
      .min(DONATION_MIN_AMOUNT, 'Amount must be at least ₱1')
      .max(DONATION_MAX_AMOUNT, 'Amount is above the ₱500,000 limit'),
    method: z.enum(DonationPaymentMethod),
  })
  .strict();

/** The `Idempotency-Key` header: one UUID per checkout attempt on the device. */
export const IdempotencyKeySchema = z.uuid(
  'Idempotency-Key header must be a UUID',
);

export const DonationPaymentIdSchema = z.uuid('A valid payment id is required');

export const DonationPaymentSchema = z.object({
  donation_payment_id: z.string(),
  campaign_id: z.string(),
  campaign_title: z.string(),
  event_id: z.number().nullable(),
  amount: z.number(),
  currency: z.string(),
  method: z.enum(DonationPaymentMethod),
  status: z.enum(DonationPaymentStatus),
  gateway_reference: z.string(),
  payment_reference: z.string().nullable(),
  payment_channel: z.string().nullable(),
  checkout_url: z.string().nullable(),
  qr_string: z.string().nullable(),
  expires_at: z.iso.datetime().nullable(),
  paid_at: z.iso.datetime().nullable(),
  failure_reason: z.string().nullable(),
  /** The ledger row opened when the checkout settled as PAID; null until then. */
  donation_id: z.string().nullable(),
  created_at: z.iso.datetime(),
});

export const DonationPaymentResponseSchema = DonationPaymentSchema;

export const DonationPaymentListResponseSchema = z.object({
  items: z.array(DonationPaymentSchema),
});

export const DonationIdSchema = z.uuid('A valid donation id is required');

export const GOODS_ITEM_MAX = 120;
export const GOODS_QUANTITY_MAX = 10_000;

/**
 * What a goods pledge carries, and what an edit may change. Goods are handed in
 * by the donor at the CARES office, so there is no address or time to collect —
 * only the day they plan to drop by and a number to reach them on.
 */
const GoodsDonationFieldsSchema = z.object({
  goodsType: z.enum(
    GOODS_TYPE_IDS,
    'Pick one of the goods this event asks for',
  ),
  /** Free text for what exactly is being given — required when the type is `other`. */
  goodsItem: z.string().trim().max(GOODS_ITEM_MAX).optional(),
  quantity: z
    .number()
    .int('Quantity must be a whole number')
    .min(1, 'Quantity must be at least 1')
    .max(GOODS_QUANTITY_MAX),
  /** PH mobile in the canonical `+639XXXXXXXXX` shape the app normalises to. */
  contactNumber: PhoneNumberSchema,
  /** Calendar day, `YYYY-MM-DD`, when the donor plans to deliver the goods. */
  deliveryDate: z.iso.date('Delivery date is required'),
});

export const CreateGoodsDonationSchema = GoodsDonationFieldsSchema.extend({
  eventId: z.number().int().positive(),
})
  .strict()
  .refine(
    (data) => data.goodsType !== 'other' || (data.goodsItem ?? '').length > 0,
    { path: ['goodsItem'], message: 'Say what you would like to donate' },
  );

export const UpdateGoodsDonationSchema =
  GoodsDonationFieldsSchema.strict().refine(
    (data) => data.goodsType !== 'other' || (data.goodsItem ?? '').length > 0,
    { path: ['goodsItem'], message: 'Say what you would like to donate' },
  );

export const DonationTrailEntrySchema = z.object({
  donation_trail_entry_id: z.string(),
  status: z.enum(DonationStatus),
  note: z.string().nullable(),
  actor_label: z.string(),
  notified_email: z.string().nullable(),
  created_at: z.iso.datetime(),
});

/** One ledger row as the donor sees it. */
export const DonationSchema = z.object({
  donation_id: z.string(),
  /** `DN-0007`. */
  reference: z.string(),
  kind: z.enum(DonationKind),
  status: z.enum(DonationStatus),
  event_id: z.number(),
  event_title: z.string(),
  /** Whole pesos: what was paid, or the credited value of the goods. */
  amount: z.number(),
  /** Money only. */
  payment_id: z.string().nullable(),
  method: z.enum(DonationPaymentMethod).nullable(),
  payment_reference: z.string().nullable(),
  /** Goods only. */
  goods_type: z.string().nullable(),
  goods_item: z.string().nullable(),
  goods_quantity: z.number().nullable(),
  donor_contact: z.string().nullable(),
  delivery_date: z.iso.date().nullable(),
  confirmed_at: z.iso.datetime().nullable(),
  trail: z.array(DonationTrailEntrySchema),
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime(),
});

export const DonationResponseSchema = DonationSchema;

export const DonationListResponseSchema = z.object({
  items: z.array(DonationSchema),
});
