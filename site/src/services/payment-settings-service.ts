import type {
  PaymentAccountProof,
  PaymentMethodKey,
  PaymentMethodVerification,
  PaymentSecretsInput,
  PaymentSettings,
  PaymentSettingsDetail,
  PaymentSettingsResult,
} from '../types/payment-settings'
import { apiClient, parseApiError } from './api-client'

interface PaymentMethodApiResponse {
  method: PaymentMethodKey
  enabled: boolean
  default_label: string
  display_name: string | null
  instructions: string | null
  account_name: string | null
  account_number: string | null
  channel_codes: string[]
  available_channel_codes: string[]
  min_amount: number
  max_amount: number
  sort_order: number
  verification: PaymentMethodVerification
  verified_at: string | null
  verification_message: string | null
  verified_channel_codes: string[]
  callbacks_registered_at: string | null
  account_proof: PaymentAccountProof
  account_proof_message: string | null
  account_proof_sent_at: string | null
  account_proof_attempts: number
  account_verified_at: string | null
  account_proof_sandbox_amount: number | null
}

interface PaymentSettingsApiResponse {
  mode: 'TEST' | 'LIVE'
  enabled: boolean
  secret_key_set: boolean
  secret_key_last4: string | null
  webhook_token_set: boolean
  using_env_credentials: boolean
  api_url: string | null
  statement_name: string | null
  support_email: string | null
  support_contact: string | null
  webhook_url: string
  verified_at: string | null
  verification_error: string | null
  methods: PaymentMethodApiResponse[]
  amount_floor: number
  amount_ceiling: number
  updated_by_user_id: string | null
  updated_at: string | null
}

function mapFromApi(data: PaymentSettingsApiResponse): PaymentSettingsDetail {
  return {
    mode: data.mode,
    enabled: data.enabled,
    apiUrl: data.api_url ?? '',
    statementName: data.statement_name ?? '',
    supportEmail: data.support_email ?? '',
    supportContact: data.support_contact ?? '',
    // The form's inputs are never undefined, so every nullable string lands as ''.
    methods: data.methods.map((method) => ({
      method: method.method,
      enabled: method.enabled,
      displayName: method.display_name ?? '',
      instructions: method.instructions ?? '',
      accountName: method.account_name ?? '',
      accountNumber: method.account_number ?? '',
      channelCodes: method.channel_codes,
      minAmount: method.min_amount,
      maxAmount: method.max_amount,
    })),

    secretKeySet: data.secret_key_set,
    secretKeyLast4: data.secret_key_last4 ?? undefined,
    webhookTokenSet: data.webhook_token_set,
    usingEnvCredentials: data.using_env_credentials,
    webhookUrl: data.webhook_url,
    verifiedAt: data.verified_at ?? undefined,
    verificationError: data.verification_error ?? undefined,
    amountFloor: data.amount_floor,
    amountCeiling: data.amount_ceiling,
    meta: data.methods.map((method) => ({
      method: method.method,
      defaultLabel: method.default_label,
      availableChannelCodes: method.available_channel_codes,
      verification: method.verification,
      verificationMessage: method.verification_message ?? undefined,
      verifiedAt: method.verified_at ?? undefined,
      verifiedChannelCodes: method.verified_channel_codes,
      callbacksRegisteredAt: method.callbacks_registered_at ?? undefined,
      accountProof: method.account_proof,
      accountProofMessage: method.account_proof_message ?? undefined,
      accountProofSentAt: method.account_proof_sent_at ?? undefined,
      accountProofAttempts: method.account_proof_attempts,
      accountVerifiedAt: method.account_verified_at ?? undefined,
      accountProofSandboxAmount:
        method.account_proof_sandbox_amount ?? undefined,
    })),
    updatedByUserId: data.updated_by_user_id ?? undefined,
    updatedAt: data.updated_at ?? undefined,
  }
}

/**
 * The server rejects unknown keys, so the payload carries the settings and nothing
 * else. A secret is sent only when the director typed one: omitted keeps what is
 * stored, and an explicit `null` clears it — which is what the "Remove" action sends.
 */
function mapToApi(settings: PaymentSettings, secrets: PaymentSecretsInput) {
  const body: Record<string, unknown> = {
    mode: settings.mode,
    enabled: settings.enabled,
    api_url: settings.apiUrl,
    statement_name: settings.statementName,
    support_email: settings.supportEmail,
    support_contact: settings.supportContact,
    methods: settings.methods.map((method) => ({
      method: method.method,
      enabled: method.enabled,
      display_name: method.displayName,
      instructions: method.instructions,
      account_name: method.accountName,
      account_number: method.accountNumber,
      channel_codes: method.channelCodes,
      min_amount: method.minAmount,
      max_amount: method.maxAmount,
    })),
  }

  if (secrets.secretKey !== undefined) {
    body.secret_key = secrets.secretKey.trim() ? secrets.secretKey.trim() : null
  }
  if (secrets.webhookToken !== undefined) {
    body.webhook_token = secrets.webhookToken.trim()
      ? secrets.webhookToken.trim()
      : null
  }

  return body
}

export async function getPaymentSettings(): Promise<PaymentSettingsResult> {
  try {
    const { data: body } = await apiClient.get<{
      ok: true
      data: PaymentSettingsApiResponse
    }>('/api/v1/payments/settings')

    return { success: true, settings: mapFromApi(body.data) }
  } catch (error) {
    return { success: false, message: parseApiError(error) }
  }
}

export async function updatePaymentSettings(
  settings: PaymentSettings,
  secrets: PaymentSecretsInput,
): Promise<PaymentSettingsResult> {
  try {
    const { data: body } = await apiClient.put<{
      ok: true
      data: PaymentSettingsApiResponse
    }>('/api/v1/payments/settings', mapToApi(settings, secrets))

    return { success: true, settings: mapFromApi(body.data) }
  } catch (error) {
    return { success: false, message: parseApiError(error) }
  }
}

/**
 * Re-runs the gateway's activation check for one channel: is it switched on for the
 * CARES account, and are its callbacks pointed at us. Answers 200 either way — the
 * verdict comes back on the method's `verification`.
 */
export async function verifyPaymentMethod(
  method: PaymentMethodKey,
): Promise<PaymentSettingsResult> {
  try {
    const { data: body } = await apiClient.post<{
      ok: true
      data: PaymentSettingsApiResponse
    }>(`/api/v1/payments/settings/methods/${method}/verify`)

    return { success: true, settings: mapFromApi(body.data) }
  } catch (error) {
    return { success: false, message: parseApiError(error) }
  }
}

/**
 * Sends the token payout that proves CARES holds the account this channel pays into.
 * The amount is picked server-side and never returned — reporting it back is the proof.
 */
export async function startAccountProof(
  method: PaymentMethodKey,
): Promise<PaymentSettingsResult> {
  try {
    const { data: body } = await apiClient.post<{
      ok: true
      data: PaymentSettingsApiResponse
    }>(`/api/v1/payments/settings/methods/${method}/account-proof`)

    return { success: true, settings: mapFromApi(body.data) }
  } catch (error) {
    return { success: false, message: parseApiError(error) }
  }
}

/** Reports the amount that arrived; a match verifies the account. */
export async function confirmAccountProof(
  method: PaymentMethodKey,
  amount: number,
): Promise<PaymentSettingsResult> {
  try {
    const { data: body } = await apiClient.post<{
      ok: true
      data: PaymentSettingsApiResponse
    }>(`/api/v1/payments/settings/methods/${method}/account-proof/confirm`, {
      amount,
    })

    return { success: true, settings: mapFromApi(body.data) }
  } catch (error) {
    return { success: false, message: parseApiError(error) }
  }
}
