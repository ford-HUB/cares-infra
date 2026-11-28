import { z } from 'zod';
import {
  DonationPaymentMethod,
  PaymentAccountProof,
  PaymentGatewayMode,
  PaymentMethodVerification,
} from '../../../infastructures/prisma/common/client';
import { PAYMENT_CHANNEL_CODES } from '../../../shared/constants/payment-methods';
import { CONTROL_CHARACTER_PATTERN } from '../../../shared/validators/control-character-validator';
import { withoutPrototypeKeys } from '../../../shared/validators/prototype-key-validator';
import {
  DONATION_MAX_AMOUNT,
  DONATION_MIN_AMOUNT,
} from '../../donations/validators/donations-mobile-validator';

export const STATEMENT_NAME_MAX = 40;
export const ACCOUNT_NAME_MAX = 120;
export const ACCOUNT_NUMBER_MAX = 40;
export const INSTRUCTIONS_MAX = 160;
export const DISPLAY_NAME_MAX = 60;

/** Only rules out a stray keystroke. */
export const SECRET_KEY_MIN = 20;
export const SECRET_KEY_MAX = 200;

/** Checked against the catalog rather than an enum, so the catalog is the only edit. */
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
    // "" from the form is stored as null.
    .transform((value) => (value.length ? value : null))
    .nullable()
    .optional();

/** Single-line: line breaks refused. */
const credential = (min: number, minMessage?: string) =>
  z
    .string()
    .trim()
    .min(min, minMessage)
    .max(SECRET_KEY_MAX)
    .refine(
      (value) =>
        !CONTROL_CHARACTER_PATTERN.test(value) && !/[\r\n]/.test(value),
      { error: 'Cannot contain control characters' },
    );

/** HTTPS only (receives the key); "" = default host. Local http mocks use `XENDIT_API_URL`. */
const gatewayUrl = z.union([
  z.literal(''),
  z.url({ protocol: /^https$/, error: 'Enter a full https:// URL' }),
]);

/** `min_amount` / `max_amount` of 0 means use module-wide limits. */
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

/** Whole-module save so "off" ≠ "not sent". Secrets are write-only: omit keeps, `null` clears, string replaces. */
export const UpdatePaymentSettingsSchema = z
  .object({
    mode: z.enum(PaymentGatewayMode),
    enabled: z.boolean(),
    secret_key: credential(
      SECRET_KEY_MIN,
      'That does not look like a Xendit secret key',
    )
      .nullable()
      .optional(),
    webhook_token: credential(8).nullable().optional(),
    api_url: gatewayUrl
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

/** Tests an unsaved key from the body; without one, the saved key. */
export const TestPaymentGatewaySchema = withoutPrototypeKeys(
  z
    .object({
      secret_key: credential(SECRET_KEY_MIN).optional(),
      api_url: gatewayUrl.optional(),
    })
    .strict(),
);

const PaymentMethodResponseSchema = z.object({
  method: z.enum(DonationPaymentMethod),
  enabled: z.boolean(),
  /** Used as the portal placeholder. */
  default_label: z.string(),
  display_name: z.string().nullable(),
  instructions: z.string().nullable(),
  account_name: z.string().nullable(),
  account_number: z.string().nullable(),
  /** Empty means the module defaults. */
  channel_codes: z.array(z.string()),
  available_channel_codes: z.array(z.string()),
  min_amount: z.number(),
  max_amount: z.number(),
  sort_order: z.number(),
  /** See `PaymentActivationService`. */
  verification: z.enum(PaymentMethodVerification),
  verified_at: z.iso.datetime().nullable(),
  verification_message: z.string().nullable(),
  verified_channel_codes: z.array(z.string()),
  callbacks_registered_at: z.iso.datetime().nullable(),
  /** The sent amount is deliberately absent: reporting it is the proof. */
  account_proof: z.enum(PaymentAccountProof),
  account_proof_message: z.string().nullable(),
  account_proof_sent_at: z.iso.datetime().nullable(),
  account_proof_attempts: z.number(),
  account_verified_at: z.iso.datetime().nullable(),
  /** Sandbox keys only (no real wallet to read); null on live keys. */
  account_proof_sandbox_amount: z.number().nullable(),
});

/** Whole pesos. */
export const ConfirmAccountProofSchema = withoutPrototypeKeys(
  z
    .object({
      amount: z
        .number()
        .int('Enter the amount in whole pesos')
        .min(1)
        .max(1000, 'That is far more than CARES would ever send'),
    })
    .strict(),
);

export const PaymentMethodParamSchema = z.enum(
  DonationPaymentMethod,
  'Unknown payment method',
);

export const PaymentSettingsResponseSchema = z.object({
  mode: z.enum(PaymentGatewayMode),
  enabled: z.boolean(),
  /** Write-only secrets: a flag plus a tail, never the value. */
  secret_key_set: z.boolean(),
  secret_key_last4: z.string().nullable(),
  webhook_token_set: z.boolean(),
  /** Running on the env `XENDIT_SECRET_KEY`; shown so the screen doesn't read as unconfigured. */
  using_env_credentials: z.boolean(),
  api_url: z.string().nullable(),
  statement_name: z.string().nullable(),
  support_email: z.string().nullable(),
  support_contact: z.string().nullable(),
  /** Read-only; paste into Xendit's callback settings. */
  webhook_url: z.string(),
  verified_at: z.iso.datetime().nullable(),
  verification_error: z.string().nullable(),
  methods: z.array(PaymentMethodResponseSchema),
  /** What a per-method 0 falls back to. */
  amount_floor: z.number(),
  amount_ceiling: z.number(),
  updated_by_user_id: z.string().nullable(),
  updated_at: z.iso.datetime().nullable(),
});

export const PAYMENT_AMOUNT_FLOOR = DONATION_MIN_AMOUNT;
export const PAYMENT_AMOUNT_CEILING = DONATION_MAX_AMOUNT;
