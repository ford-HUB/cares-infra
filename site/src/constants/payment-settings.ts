import type {
  PaymentAccountProof,
  PaymentGatewayMode,
  PaymentMethodKey,
  PaymentMethodVerification,
} from '../types/payment-settings'

/** Mirrors server `payments-site-validator.ts`. */
export const STATEMENT_NAME_MAX = 40
export const ACCOUNT_NAME_MAX = 120
export const ACCOUNT_NUMBER_MAX = 40
export const INSTRUCTIONS_MAX = 160
export const DISPLAY_NAME_MAX = 60

/** Matches the server's catalog order. */
export const PAYMENT_METHOD_ORDER: readonly PaymentMethodKey[] = [
  'GCASH',
  'QRPH',
  'CARD',
  'BANK_TRANSFER',
]

/** Same marks the donor app shows. */
export const PAYMENT_METHOD_LOGOS: Record<PaymentMethodKey, string> = {
  GCASH: '/payment/gcash.svg',
  QRPH: '/payment/qrph.svg',
  CARD: '/payment/card.svg',
  BANK_TRANSFER: '/payment/bank.svg',
}

export const PAYMENT_METHOD_TAGLINES: Record<PaymentMethodKey, string> = {
  GCASH: 'E-wallet',
  QRPH: 'QR code, any bank or e-wallet',
  CARD: 'Visa · Mastercard',
  BANK_TRANSFER: 'Online banking',
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethodKey, string> = {
  GCASH: 'GCash',
  QRPH: 'QR Ph',
  CARD: 'Credit/Debit Card',
  BANK_TRANSFER: 'Bank Transfer',
}

/** Cards settle to the Xendit balance with no named account. */
export const PAYMENT_METHOD_COLLECTS_ACCOUNT: Record<PaymentMethodKey, boolean> = {
  GCASH: true,
  QRPH: true,
  CARD: false,
  BANK_TRANSFER: true,
}

export interface PaymentAccountFields {
  nameLabel: string
  namePlaceholder: string
  numberLabel: string
  numberPlaceholder: string
  numberType: 'tel' | 'text'
  hint: string
}

export const PAYMENT_ACCOUNT_FIELDS: Record<PaymentMethodKey, PaymentAccountFields> = {
  GCASH: {
    nameLabel: 'GCash account name',
    namePlaceholder: 'CARES — Cebu Institute of Technology',
    numberLabel: 'GCash number',
    numberPlaceholder: '09XX XXX XXXX',
    numberType: 'tel',
    hint: 'The 11-digit mobile number registered to the GCash account.',
  },
  QRPH: {
    nameLabel: 'Account name',
    namePlaceholder: 'CARES — Cebu Institute of Technology',
    numberLabel: 'Mobile number or account',
    numberPlaceholder: '09XX XXX XXXX',
    numberType: 'tel',
    hint: 'Whatever sits behind the QR — usually the same GCash number.',
  },
  CARD: {
    nameLabel: 'Account name',
    namePlaceholder: '',
    numberLabel: 'Account number',
    numberPlaceholder: '',
    numberType: 'text',
    hint: '',
  },
  BANK_TRANSFER: {
    nameLabel: 'Bank account name',
    namePlaceholder: 'CARES — Cebu Institute of Technology',
    numberLabel: 'Bank account number',
    numberPlaceholder: '0000 0000 0000',
    numberType: 'text',
    hint: 'The CARES account at the bank, as it appears on the statement.',
  },
}

export const CARD_ACCOUNT_NOTE =
  'Card payments settle into the CARES Xendit balance — there is no separate account to record.'

/** Display only: Xendit pays out to its own configured account. */
export const ACCOUNT_DISPLAY_ONLY_NOTE =
  'Shown to donors on their receipt. Where Xendit actually pays out is set in the Xendit dashboard, not here.'

export const PH_MOBILE_PATTERN = /^(09\d{9}|\+639\d{9})$/

export const BANK_ACCOUNT_PATTERN = /^\d{8,20}$/

/** Codes arrive as e.g. `DD_BPI`. */
export const PAYMENT_CHANNEL_LABELS: Record<string, string> = {
  CREDIT_CARD: 'Visa / Mastercard',
  DD_BPI: 'BPI',
  DD_UBP: 'UnionBank',
  DD_RCBC: 'RCBC',
  DD_CHINABANK: 'China Bank',
}

export const PAYMENT_MODE_LABELS: Record<PaymentGatewayMode, string> = {
  TEST: 'Test (sandbox)',
  LIVE: 'Live',
}

export const VERIFICATION_LABELS: Record<PaymentMethodVerification, string> = {
  NOT_VERIFIED: 'Not checked',
  PENDING: 'Waiting for Xendit',
  VERIFIED: 'Active',
  FAILED: 'Needs attention',
}

export const VERIFICATION_BADGE_STYLES: Record<PaymentMethodVerification, string> = {
  NOT_VERIFIED: 'bg-gray-100 text-gray-600',
  PENDING: 'bg-amber-50 text-amber-700',
  VERIFIED: 'bg-emerald-50 text-emerald-700',
  FAILED: 'bg-red-50 text-red-700',
}

/** PENDING also covers an unconfirmed test payout, which is the director's step. */
export const ACCOUNT_UNPROVEN_LABEL = 'Verify the account'

export const VERIFICATION_DOT_STYLES: Record<PaymentMethodVerification, string> = {
  NOT_VERIFIED: 'bg-gray-300',
  PENDING: 'bg-amber-500',
  VERIFIED: 'bg-emerald-500',
  FAILED: 'bg-red-500',
}

export const ACCOUNT_PROOF_COPY: Record<
  PaymentAccountProof,
  { label: string; hint: string; surface: string; text: string; icon: string }
> = {
  NOT_STARTED: {
    label: 'Account not verified',
    hint: 'CARES will send a small payout to this account. Report the amount that arrives to prove it is yours.',
    surface: 'bg-amber-50/60',
    text: 'text-amber-800',
    icon: 'text-amber-600',
  },
  SENDING: {
    label: 'Test payout sending',
    hint: 'The payout is with Xendit. Check the account in a moment.',
    surface: 'bg-gray-50',
    text: 'text-gray-700',
    icon: 'text-gray-500',
  },
  AWAITING_CONFIRMATION: {
    label: 'Waiting for your confirmation',
    hint: 'Check the account and enter the exact amount that arrived.',
    surface: 'bg-amber-50/60',
    text: 'text-amber-800',
    icon: 'text-amber-600',
  },
  VERIFIED: {
    label: 'Account verified',
    hint: 'The amount matched — CARES can reach this account.',
    surface: 'bg-emerald-50/60',
    text: 'text-emerald-800',
    icon: 'text-emerald-600',
  },
  FAILED: {
    label: 'Verification failed',
    hint: 'Send a new test payout to try again.',
    surface: 'bg-red-50/60',
    text: 'text-red-800',
    icon: 'text-red-600',
  },
}

export const ACTIVATION_STEPS: readonly string[] = [
  'Check with Xendit that this channel is switched on for the CARES account',
  'Point its callback URLs at CARES so paid donations report back',
  'Offer it to donors in the app straight away',
]
