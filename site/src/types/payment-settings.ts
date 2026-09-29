/** The four channels the server's `DonationPaymentMethod` enum names. */
export type PaymentMethodKey = 'GCASH' | 'QRPH' | 'CARD' | 'BANK_TRANSFER'

export type PaymentGatewayMode = 'TEST' | 'LIVE'

/**
 * One channel as the director configures it. `minAmount` / `maxAmount` are 0 when the
 * channel follows the module-wide donation limits, matching the server's "0 means
 * unset" convention.
 */
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

/**
 * Where a channel stands with the gateway, as the server's activation check left it.
 * `pending` is the state everything sits in until the CARES Xendit account exists.
 */
export type PaymentMethodVerification =
  | 'NOT_VERIFIED'
  | 'PENDING'
  | 'VERIFIED'
  | 'FAILED'

/**
 * How far the receiving account has got through ownership proof: CARES sends a small
 * payout of a random amount, and the director proves they hold the account by
 * reporting what arrived.
 */
export type PaymentAccountProof =
  | 'NOT_STARTED'
  | 'SENDING'
  | 'AWAITING_CONFIRMATION'
  | 'VERIFIED'
  | 'FAILED'

/** The channel's built-in copy, its Xendit codes and its activation state — read-only. */
export interface PaymentMethodMeta {
  method: PaymentMethodKey
  defaultLabel: string
  availableChannelCodes: string[]
  verification: PaymentMethodVerification
  /** The gateway's own words, shown under the badge. */
  verificationMessage?: string
  verifiedAt?: string
  verifiedChannelCodes: string[]
  callbacksRegisteredAt?: string
  /** The amount CARES sent is never returned — reporting it is the proof. */
  accountProof: PaymentAccountProof
  accountProofMessage?: string
  accountProofSentAt?: string
  accountProofAttempts: number
  accountVerifiedAt?: string
  /**
   * What CARES sent — only ever present on a sandbox key, where no money reaches a
   * real wallet and there is nothing for the director to read. Absent on a live key.
   */
  accountProofSandboxAmount?: number
}

/** What the form edits. The secrets are write-only, so they are not part of it. */
export interface PaymentSettings {
  mode: PaymentGatewayMode
  enabled: boolean
  apiUrl: string
  statementName: string
  supportEmail: string
  supportContact: string
  methods: PaymentMethodSetting[]
}

/** The settings plus everything the screen reports but cannot edit. */
export interface PaymentSettingsDetail extends PaymentSettings {
  secretKeySet: boolean
  secretKeyLast4?: string
  webhookTokenSet: boolean
  /** True while the API is still running on the key from the server's environment. */
  usingEnvCredentials: boolean
  /** The callback URL to paste into Xendit's dashboard. */
  webhookUrl: string
  verifiedAt?: string
  verificationError?: string
  amountFloor: number
  amountCeiling: number
  meta: PaymentMethodMeta[]
  updatedByUserId?: string
  updatedAt?: string
}

/** The two secrets a save may carry: absent keeps the stored one, '' clears it. */
export interface PaymentSecretsInput {
  secretKey?: string
  webhookToken?: string
}

export interface PaymentSettingsResult {
  success: boolean
  message?: string
  settings?: PaymentSettingsDetail
}
