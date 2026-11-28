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
  /** Skeleton until loaded so the form doesn't jump from defaults to saved values. */
  initialized: boolean
  saving: boolean
  verifying: PaymentMethodKey | null
  error: string | null
  fetchSettings: () => Promise<void>
  saveSettings: (
    settings: PaymentSettings,
    secrets: PaymentSecretsInput,
  ) => Promise<SaveOutcome>
  verifyMethod: (method: PaymentMethodKey) => Promise<SaveOutcome>
  sendAccountProof: (method: PaymentMethodKey) => Promise<SaveOutcome>
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

    // The saved copy carries the new `updated_at`; no refetch needed.
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

    // A refused channel is a failed check, not a failed request.
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

    // A refused send is a failed proof, not a failed request.
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
