import { z } from 'zod';
import {
  DonationPaymentMethod,
  PaymentAccountProof,
  PaymentGatewayMode,
  PaymentMethodVerification,
} from '../../../infastructures/prisma/common/client';
import { PAYMENT_CHANNEL_CODES } from '../../../shared/constants/payment-methods';
import {
  DONATION_MAX_AMOUNT,
  DONATION_MIN_AMOUNT,
} from '../../donations/validators/donations-mobile-validator';

export const STATEMENT_NAME_MAX = 40;
export const ACCOUNT_NAME_MAX = 120;
export const ACCOUNT_NUMBER_MAX = 40;
export const INSTRUCTIONS_MAX = 160;
export const DISPLAY_NAME_MAX = 60;

/** Xendit keys are long; the floor only rules out a stray keystroke. */
export const SECRET_KEY_MIN = 20;
export const SECRET_KEY_MAX = 200;

/** A Xendit channel code the catalog knows about — checked against the list rather
 * than typed as an enum, so adding a code to the catalog is the only edit needed. */
const channelCode = z
  .string()
  .trim()
  .refine((code) => PAYMENT_CHANNEL_CODES.includes(code), {
    error: 'Unknown payment channel',
  });

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    // The form sends "" for an empty box; stored as null so "unset" is one value.
    .transform((value) => (value.length ? value : null))
    .nullable()
    .optional();

/**
 * One channel as the director configures it. `min_amount` / `max_amount` are 0 when
 * the channel simply follows the module-wide donation limits — the same "0 means
 * unset" convention the security policy uses for its timeouts.
 */
export const PaymentMethodSettingSchema = z
  .object({
    method: z.enum(DonationPaymentMethod),
    enabled: z.boolean(),
    display_name: optionalText(DISPLAY_NAME_MAX),
    instructions: optionalText(INSTRUCTIONS_MAX),
    account_name: optionalText(ACCOUNT_NAME_MAX),
    account_number: optionalText(ACCOUNT_NUMBER_MAX),
    channel_codes: z.array(channelCode).max(20).default([]),
    min_amount: z.number().int().min(0).max(DONATION_MAX_AMOUNT).default(0),
    max_amount: z.number().int().min(0).max(DONATION_MAX_AMOUNT).default(0),
  })
  .strict()
  .refine(
    (entry) =>
      entry.max_amount === 0 ||
      entry.min_amount === 0 ||
      entry.max_amount >= entry.min_amount,
    {
      error: 'The maximum must not be below the minimum',
      path: ['max_amount'],
    },
  );

/**
 * The whole module is saved at once, like the security policy: a partial update would
 * make "switched off" indistinguishable from "not sent".
 *
 * The two secrets are the exception. They are write-only — the server never hands them
 * back, so the form cannot round-trip them. Omitting a secret keeps what is stored;
 * sending `null` clears it; sending a string replaces it.
 */
export const UpdatePaymentSettingsSchema = z
  .object({
    mode: z.enum(PaymentGatewayMode),
    enabled: z.boolean(),
    secret_key: z
      .string()
      .trim()
      .min(SECRET_KEY_MIN, 'That does not look like a Xendit secret key')
      .max(SECRET_KEY_MAX)
      .nullable()
      .optional(),
    webhook_token: z
      .string()
      .trim()
      .min(8)
      .max(SECRET_KEY_MAX)
      .nullable()
      .optional(),
    api_url: z
      .union([z.literal(''), z.url('Enter a full https:// URL')])
      .transform((value) => (value.length ? value : null))
      .nullable()
      .optional(),
    statement_name: optionalText(STATEMENT_NAME_MAX),
    support_email: z
      .union([z.literal(''), z.email('Enter a valid email address')])
      .transform((value) => (value.length ? value : null))
      .nullable()
      .optional(),
    support_contact: optionalText(ACCOUNT_NUMBER_MAX),
    methods: z.array(PaymentMethodSettingSchema).max(20),
  })
  .strict()
  .refine(
    (body) =>
      new Set(body.methods.map((m) => m.method)).size === body.methods.length,
    { error: 'Each payment method may appear only once', path: ['methods'] },
  );

/**
 * "Test connection" before saving: the key being tried is sent in the body so the
 * director can check a key that is not stored yet. With no key, the saved one is used.
 */
export const TestPaymentGatewaySchema = z
  .object({
    secret_key: z
      .string()
      .trim()
      .min(SECRET_KEY_MIN)
      .max(SECRET_KEY_MAX)
      .optional(),
    api_url: z.union([z.literal(''), z.url()]).optional(),
  })
  .strict();

const PaymentMethodResponseSchema = z.object({
  method: z.enum(DonationPaymentMethod),
  enabled: z.boolean(),
  /** The channel's built-in name, so the portal can show it as the placeholder. */
  default_label: z.string(),
  display_name: z.string().nullable(),
  instructions: z.string().nullable(),
  account_name: z.string().nullable(),
  account_number: z.string().nullable(),
  /** Which Xendit codes this channel may open; empty means the module defaults. */
  channel_codes: z.array(z.string()),
  available_channel_codes: z.array(z.string()),
  min_amount: z.number(),
  max_amount: z.number(),
  sort_order: z.number(),
  /** Where this channel stands with the gateway — see `PaymentActivationService`. */
  verification: z.enum(PaymentMethodVerification),
  verified_at: z.iso.datetime().nullable(),
  verification_message: z.string().nullable(),
  verified_channel_codes: z.array(z.string()),
  callbacks_registered_at: z.iso.datetime().nullable(),
  /**
   * Ownership proof. The amount CARES sent is deliberately absent — the director
   * reporting it is the proof, so it must not travel to the screen that asks.
   */
  account_proof: z.enum(PaymentAccountProof),
  account_proof_message: z.string().nullable(),
  account_proof_sent_at: z.iso.datetime().nullable(),
  account_proof_attempts: z.number(),
  account_verified_at: z.iso.datetime().nullable(),
  /**
   * The amount CARES sent — present **only** when the gateway key is a Xendit
   * development key, where no money reaches a real wallet and there is therefore
   * nothing for the director to read. Null on a live key, where reporting the amount
   * from the wallet is the entire proof.
   */
  account_proof_sandbox_amount: z.number().nullable(),
});

/** What the director reports arrived, in whole pesos. */
export const ConfirmAccountProofSchema = z
  .object({
    amount: z
      .number()
      .int('Enter the amount in whole pesos')
      .min(1)
      .max(1000, 'That is far more than CARES would ever send'),
  })
  .strict();

/** `:method` on the activation endpoint. */
export const PaymentMethodParamSchema = z.enum(
  DonationPaymentMethod,
  'Unknown payment method',
);

export const PaymentSettingsResponseSchema = z.object({
  mode: z.enum(PaymentGatewayMode),
  enabled: z.boolean(),
  /** Write-only secrets are reported as a flag plus a tail, never as the value. */
  secret_key_set: z.boolean(),
  secret_key_last4: z.string().nullable(),
  webhook_token_set: z.boolean(),
  /**
   * True while no key has been saved and the API is still running on
   * `XENDIT_SECRET_KEY` from the environment — the portal says so out loud, because
   * the screen would otherwise read as "payments are not set up".
   */
  using_env_credentials: z.boolean(),
  api_url: z.string().nullable(),
  statement_name: z.string().nullable(),
  support_email: z.string().nullable(),
  support_contact: z.string().nullable(),
  /** Read-only: the URL to paste into Xendit's callback settings. */
  webhook_url: z.string(),
  verified_at: z.iso.datetime().nullable(),
  verification_error: z.string().nullable(),
  methods: z.array(PaymentMethodResponseSchema),
  /** Donation floor and ceiling a per-method 0 falls back to. */
  amount_floor: z.number(),
  amount_ceiling: z.number(),
  updated_by_user_id: z.string().nullable(),
  updated_at: z.iso.datetime().nullable(),
});

export const PAYMENT_AMOUNT_FLOOR = DONATION_MIN_AMOUNT;
export const PAYMENT_AMOUNT_CEILING = DONATION_MAX_AMOUNT;
