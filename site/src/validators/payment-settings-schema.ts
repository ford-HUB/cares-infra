import { z } from 'zod'
import {
  ACCOUNT_NAME_MAX,
  ACCOUNT_NUMBER_MAX,
  DISPLAY_NAME_MAX,
  INSTRUCTIONS_MAX,
  BANK_ACCOUNT_PATTERN,
  PAYMENT_METHOD_COLLECTS_ACCOUNT,
  PAYMENT_METHOD_ORDER,
  PH_MOBILE_PATTERN,
  STATEMENT_NAME_MAX,
} from '../constants/payment-settings'

/** Spaces and dashes are how people type an account; they are not part of it. */
const bareNumber = (value: string) => value.replace(/[\s-]/g, '')

/**
 * Mirrors `payments-site-validator.ts` on the server. Duplicated rather than shared
 * because the two speak different field names, but the bounds must stay in step — a
 * value this schema accepts and the server rejects surfaces as a bare 400.
 *
 * The gateway credentials are not part of it: they are write-only on the server and
 * this screen does not edit them, so a save never carries one.
 */
const methodSchema = z
  .object({
    method: z.enum(PAYMENT_METHOD_ORDER),
    enabled: z.boolean(),
    displayName: z.string().trim().max(DISPLAY_NAME_MAX),
    instructions: z.string().trim().max(INSTRUCTIONS_MAX),
    accountName: z.string().trim().max(ACCOUNT_NAME_MAX),
    accountNumber: z.string().trim().max(ACCOUNT_NUMBER_MAX),
    channelCodes: z.array(z.string()).max(20),
    minAmount: z.number({ message: 'Minimum must be a number' }).int().min(0),
    maxAmount: z.number({ message: 'Maximum must be a number' }).int().min(0),
  })
  .refine(
    (method) =>
      method.maxAmount === 0 ||
      method.minAmount === 0 ||
      method.maxAmount >= method.minAmount,
    { message: 'The maximum must not be below the minimum', path: ['maxAmount'] },
  )
  // A GCash or QR Ph account *is* a mobile number, so a typo is catchable here rather
  // than being shown to a donor as the place their money went.
  .refine(
    (method) =>
      (method.method !== 'GCASH' && method.method !== 'QRPH') ||
      method.accountNumber.length === 0 ||
      PH_MOBILE_PATTERN.test(bareNumber(method.accountNumber)),
    {
      message: 'Enter an 11-digit mobile number, e.g. 09171234567',
      path: ['accountNumber'],
    },
  )
  .refine(
    (method) =>
      method.method !== 'BANK_TRANSFER' ||
      method.accountNumber.length === 0 ||
      BANK_ACCOUNT_PATTERN.test(bareNumber(method.accountNumber)),
    {
      message: 'A bank account number is 8 to 20 digits, no letters',
      path: ['accountNumber'],
    },
  )
  // Everything below only applies to a channel that is actually being offered — an
  // off channel is allowed to be half-filled, an offered one is not.
  .refine(
    (method) =>
      !method.enabled ||
      !PAYMENT_METHOD_COLLECTS_ACCOUNT[method.method] ||
      method.accountNumber.trim().length > 0,
    {
      message: 'Record the account donors will be paying into',
      path: ['accountNumber'],
    },
  )
  .refine(
    (method) =>
      !method.enabled ||
      !PAYMENT_METHOD_COLLECTS_ACCOUNT[method.method] ||
      method.accountName.trim().length > 0,
    {
      message: 'Add the name on the account, so donors can see who they paid',
      path: ['accountName'],
    },
  )
  .refine(
    (method) =>
      !method.enabled ||
      method.method !== 'BANK_TRANSFER' ||
      method.channelCodes.length > 0,
    {
      message: 'Pick the bank this account is held at',
      path: ['channelCodes'],
    },
  )

export const paymentSettingsSchema = z
  .object({
    mode: z.enum(['TEST', 'LIVE']),
    enabled: z.boolean(),
    apiUrl: z
      .string()
      .trim()
      .refine((value) => value.length === 0 || /^https?:\/\//.test(value), {
        message: 'Enter a full https:// URL, or leave it blank',
      }),
    statementName: z.string().trim().max(STATEMENT_NAME_MAX),
    supportEmail: z
      .string()
      .trim()
      .refine((value) => value.length === 0 || z.email().safeParse(value).success, {
        message: 'Enter a valid email address, or leave it blank',
      }),
    supportContact: z.string().trim().max(ACCOUNT_NUMBER_MAX),
    methods: z.array(methodSchema),
  })
  .superRefine((values, ctx) => {
    // Taking money with no channel open would leave donors a method step with nothing
    // on it, so the switch and the channels have to agree.
    if (values.enabled && !values.methods.some((method) => method.enabled)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Enable at least one payment method, or switch donations off',
        path: ['methods'],
      })
    }
  })

export type PaymentSettingsFormValues = z.infer<typeof paymentSettingsSchema>

/** What the form shows before the saved settings arrive, and on a fresh install. */
export const paymentSettingsDefaultValues: PaymentSettingsFormValues = {
  mode: 'TEST',
  enabled: false,
  apiUrl: '',
  statementName: '',
  supportEmail: '',
  supportContact: '',
  methods: PAYMENT_METHOD_ORDER.map((method) => ({
    method,
    enabled: false,
    displayName: '',
    instructions: '',
    accountName: '',
    accountNumber: '',
    channelCodes: [],
    minAmount: 0,
    maxAmount: 0,
  })),
}
