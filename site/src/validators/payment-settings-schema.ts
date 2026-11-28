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

const bareNumber = (value: string) => value.replace(/[\s-]/g, '')

/** Mirrors server `payments-site-validator.ts`; keep bounds in sync or saves 400. Credentials excluded. */
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
  // Off channels may be half-filled; offered ones may not.
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
    if (values.enabled && !values.methods.some((method) => method.enabled)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Enable at least one payment method, or switch donations off',
        path: ['methods'],
      })
    }
  })

export type PaymentSettingsFormValues = z.infer<typeof paymentSettingsSchema>

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
