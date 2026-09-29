import { create } from 'zustand'
import {
  confirmAccountProof,
  getPaymentSettings,
  startAccountProof,
  updatePaymentSettings,
  verifyPaymentMethod,
} from '../services/payment-settings-service'
import type {
  PaymentMethodKey,
  PaymentSecretsInput,
  PaymentSettings,
  PaymentSettingsDetail,
} from '../types/payment-settings'

interface SaveOutcome {
  ok: boolean
  message?: string
}

interface PaymentSettingsState {
  settings: PaymentSettingsDetail | null
  loading: boolean
  /**
   * False until the first fetch settles. The form must not populate from defaults and
   * then jump to the saved values — it renders a skeleton until this flips.
   */
  initialized: boolean
  saving: boolean
  /** The channel whose activation check is in flight, so only its card spins. */
  verifying: PaymentMethodKey | null
  error: string | null
  fetchSettings: () => Promise<void>
  saveSettings: (
    settings: PaymentSettings,
    secrets: PaymentSecretsInput,
  ) => Promise<SaveOutcome>
  verifyMethod: (method: PaymentMethodKey) => Promise<SaveOutcome>
  /** Sends the token payout for this channel's account. */
  sendAccountProof: (method: PaymentMethodKey) => Promise<SaveOutcome>
  /** Reports the amount that arrived. */
  confirmAccount: (
    method: PaymentMethodKey,
    amount: number,
  ) => Promise<SaveOutcome>
}

export const usePaymentSettingsStore = create<PaymentSettingsState>((set) => ({
  settings: null,
  loading: false,
  initialized: false,
  saving: false,
  verifying: null,
  error: null,

  fetchSettings: async () => {
    set({ loading: true, error: null })
    const result = await getPaymentSettings()

    set({
      settings: result.settings ?? null,
      loading: false,
      initialized: true,
      error: result.success
        ? null
        : (result.message ?? 'Failed to load the payment settings'),
    })
  },

  saveSettings: async (settings, secrets) => {
    set({ saving: true })
    const result = await updatePaymentSettings(settings, secrets)

    if (!result.success) {
      set({ saving: false })
      return { ok: false, message: result.message }
    }

    // Keep the saved copy: it carries the new `updated_at`, which the form's footer
    // shows, and a refetch would only ask for what the response already returned.
    set({ settings: result.settings ?? null, saving: false, error: null })
    return { ok: true }
  },

  verifyMethod: async (method) => {
    set({ verifying: method })
    const result = await verifyPaymentMethod(method)

    if (!result.success) {
      set({ verifying: null })
      return { ok: false, message: result.message }
    }

    set({ settings: result.settings ?? null, verifying: null })

    // A gateway that answered and refused the channel is a failed check, not a failed
    // request — the reason rides back on the method.
    const checked = result.settings?.meta.find((entry) => entry.method === method)
    return {
      ok: checked?.verification !== 'FAILED',
      message: checked?.verificationMessage,
    }
  },

  sendAccountProof: async (method) => {
    set({ verifying: method })
    const result = await startAccountProof(method)

    if (!result.success) {
      set({ verifying: null })
      return { ok: false, message: result.message }
    }

    set({ settings: result.settings ?? null, verifying: null })

    // A gateway that refused to send is a failed proof, not a failed request — the
    // reason rides back on the method.
    const proof = result.settings?.meta.find((entry) => entry.method === method)
    return {
      ok: proof?.accountProof !== 'FAILED',
      message: proof?.accountProofMessage,
    }
  },

  confirmAccount: async (method, amount) => {
    set({ verifying: method })
    const result = await confirmAccountProof(method, amount)

    if (!result.success) {
      set({ verifying: null })
      return { ok: false, message: result.message }
    }

    set({ settings: result.settings ?? null, verifying: null })

    const proof = result.settings?.meta.find((entry) => entry.method === method)
    return {
      ok: proof?.accountProof === 'VERIFIED',
      message: proof?.accountProofMessage,
    }
  },
}))
