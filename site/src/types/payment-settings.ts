/** Server `DonationPaymentMethod` values. */
export type PaymentMethodKey = 'GCASH' | 'QRPH' | 'CARD' | 'BANK_TRANSFER'

export type PaymentGatewayMode = 'TEST' | 'LIVE'

/** Min/max are 0 when following module-wide limits (server's "0 means unset"). */
export interface PaymentMethodSetting {
  method: PaymentMethodKey
  enabled: boolean
  displayName: string
  instructions: string
  accountName: string
  accountNumber: string
  channelCodes: string[]
  minAmount: number
  maxAmount: number
}

/** `pending` until the CARES Xendit account exists. */
export type PaymentMethodVerification =
  | 'NOT_VERIFIED'
  | 'PENDING'
  | 'VERIFIED'
  | 'FAILED'

/** CARES sends a random small payout; the director proves ownership by reporting it. */
export type PaymentAccountProof =
  | 'NOT_STARTED'
  | 'SENDING'
  | 'AWAITING_CONFIRMATION'
  | 'VERIFIED'
  | 'FAILED'

export interface PaymentMethodMeta {
  method: PaymentMethodKey
  defaultLabel: string
  availableChannelCodes: string[]
  verification: PaymentMethodVerification
  verificationMessage?: string
  verifiedAt?: string
  verifiedChannelCodes: string[]
  callbacksRegisteredAt?: string
  /** The sent amount is never returned; reporting it is the proof. */
  accountProof: PaymentAccountProof
  accountProofMessage?: string
  accountProofSentAt?: string
  accountProofAttempts: number
  accountVerifiedAt?: string
  /** Sandbox keys only; absent on a live key. */
  accountProofSandboxAmount?: number
}

/** Secrets are write-only, so not part of it. */
export interface PaymentSettings {
  mode: PaymentGatewayMode
  enabled: boolean
  apiUrl: string
  statementName: string
  supportEmail: string
  supportContact: string
  methods: PaymentMethodSetting[]
}

export interface PaymentSettingsDetail extends PaymentSettings {
  secretKeySet: boolean
  secretKeyLast4?: string
  webhookTokenSet: boolean
  /** Still on the key from the server's environment. */
  usingEnvCredentials: boolean
  /** Paste into Xendit's dashboard. */
  webhookUrl: string
  verifiedAt?: string
  verificationError?: string
  amountFloor: number
  amountCeiling: number
  meta: PaymentMethodMeta[]
  updatedByUserId?: string
  updatedAt?: string
}

/** Absent keeps the stored secret, '' clears it. */
export interface PaymentSecretsInput {
  secretKey?: string
  webhookToken?: string
}

export interface PaymentSettingsResult {
  success: boolean
  message?: string
  settings?: PaymentSettingsDetail
}
