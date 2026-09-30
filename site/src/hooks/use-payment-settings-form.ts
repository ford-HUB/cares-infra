import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { PAYMENT_METHOD_ORDER } from '../constants/payment-settings'
import { usePaymentSettingsStore } from '../store/payment-settings-store'
import type {
  PaymentMethodKey,
  PaymentSettings,
  PaymentSettingsDetail,
} from '../types/payment-settings'
import {
  paymentSettingsDefaultValues,
  paymentSettingsSchema,
  type PaymentSettingsFormValues,
} from '../validators/payment-settings-schema'

/**
 * Drops everything the server reports but does not accept back — the audit fields, the
 * key's last four, the webhook URL.
 */
function toFormValues(settings: PaymentSettingsDetail): PaymentSettingsFormValues {
  return {
    mode: settings.mode,
    enabled: settings.enabled,
    // Carried through untouched: this screen does not edit them, and the server
    // replaces the whole row on save.
    apiUrl: settings.apiUrl,
    statementName: settings.statementName,
    supportEmail: settings.supportEmail,
    supportContact: settings.supportContact,
    methods: PAYMENT_METHOD_ORDER.map((method) => {
      const saved = settings.methods.find((entry) => entry.method === method)
      return saved ?? paymentSettingsDefaultValues.methods.find((m) => m.method === method)!
    }),
  }
}

/** The editable half of the form, in the shape the service maps to the API. */
function toSettings(values: PaymentSettingsFormValues): PaymentSettings {
  return {
    mode: values.mode,
    enabled: values.enabled,
    apiUrl: values.apiUrl,
    statementName: values.statementName,
    supportEmail: values.supportEmail,
    supportContact: values.supportContact,
    methods: values.methods,
  }
}

export function usePaymentSettingsForm() {
  const settings = usePaymentSettingsStore((state) => state.settings)
  const loading = usePaymentSettingsStore((state) => state.loading)
  const initialized = usePaymentSettingsStore((state) => state.initialized)
  const saving = usePaymentSettingsStore((state) => state.saving)
  const error = usePaymentSettingsStore((state) => state.error)
  const fetchSettings = usePaymentSettingsStore((state) => state.fetchSettings)
  const saveSettings = usePaymentSettingsStore((state) => state.saveSettings)
  const verifying = usePaymentSettingsStore((state) => state.verifying)
  const verifyMethod = usePaymentSettingsStore((state) => state.verifyMethod)
  const sendAccountProof = usePaymentSettingsStore((state) => state.sendAccountProof)
  const confirmAccount = usePaymentSettingsStore((state) => state.confirmAccount)

  /**
   * The channel the confirmation dialog is open on. Switching one on is not a form
   * edit that waits for Save — it asks the gateway to activate the channel — so the
   * director confirms it, and confirming commits.
   */
  const [confirming, setConfirming] = useState<PaymentMethodKey | null>(null)

  const form = useForm<PaymentSettingsFormValues>({
    resolver: zodResolver(paymentSettingsSchema),
    defaultValues: paymentSettingsDefaultValues,
  })

  useEffect(() => {
    void fetchSettings()
  }, [fetchSettings])

  /**
   * Resets rather than sets each field, so the saved settings become the form's
   * baseline — that is what makes `isDirty` mean "differs from what is stored" and lets
   * Save stay disabled until something actually changed.
   */
  useEffect(() => {
    if (!settings) return

    form.reset(toFormValues(settings))
  }, [settings, form])

  // No credentials travel with a save from this screen — the gateway account is
  // entered elsewhere, and an omitted secret leaves the stored one alone.
  const save = async (message: string) => {
    // The switch and the dialog save without going through `handleSubmit`, so the
    // account rules are run by hand — otherwise a channel could be offered with the
    // very details the server is about to refuse it for.
    if (!(await form.trigger())) {
      toast.error('Check the highlighted fields before offering this method')
      return false
    }

    const result = await saveSettings(toSettings(form.getValues()), {})

    if (result.ok) {
      toast.success(message)
      return true
    }

    toast.error(result.message ?? 'Failed to save the payment settings')
    return false
  }

  const onSubmit = form.handleSubmit(async () => {
    await save('Payment settings updated')
  })

  const indexOf = (method: PaymentMethodKey) =>
    form.getValues('methods').findIndex((entry) => entry.method === method)

  /**
   * The switch on a method card. Turning one on opens the confirmation first; turning
   * one off is immediate — there is nothing to confirm about offering less.
   */
  const onToggleMethod = (method: PaymentMethodKey, next: boolean) => {
    if (next) {
      setConfirming(method)
      return
    }

    const index = indexOf(method)
    if (index < 0) return
    form.setValue(`methods.${index}.enabled`, false, { shouldDirty: true })
    void save('Payment method switched off')
  }

  /**
   * Confirming commits the switch and saves, and the server runs the activation check
   * for that channel as part of the save — so the card comes back carrying the
   * gateway's verdict rather than an optimistic "on".
   */
  const onConfirmMethod = async () => {
    const method = confirming
    if (!method) return

    const index = indexOf(method)
    if (index < 0) return
    setConfirming(null)

    form.setValue(`methods.${index}.enabled`, true, { shouldDirty: true })
    if (!(await save('Payment method switched on'))) return

    const checked = usePaymentSettingsStore
      .getState()
      .settings?.meta.find((entry) => entry.method === method)

    // The activation check ran server-side during that save; say what it found rather
    // than leaving the director to spot the badge.
    if (checked?.verification === 'PENDING') {
      toast('Waiting for the Xendit account before this can take payments', {
        icon: '\u23F3',
      })
    } else if (checked?.verification === 'FAILED') {
      toast.error(checked.verificationMessage ?? 'Xendit refused this method')
    }
  }

  /** Step one of the walk-through: store the account before anything is sent to it. */
  const onSaveDetails = async () => {
    await save('Account details saved')
  }

  /**
   * Both proof steps save the form first: the payout goes to the number in the box,
   * so an unsaved edit would send money to the old account.
   */
  const onSendAccountProof = async (method: PaymentMethodKey) => {
    if (form.formState.isDirty && !(await save('Payment settings updated'))) return

    const result = await sendAccountProof(method)
    if (result.ok) {
      toast.success('Test payout sent — check the account')
      return
    }

    toast.error(result.message ?? 'The test payout could not be sent')
  }

  const onConfirmAccount = async (method: PaymentMethodKey, amount: number) => {
    const result = await confirmAccount(method, amount)

    if (result.ok) {
      toast.success('Account verified')
      return
    }

    toast.error(result.message ?? 'That is not the amount CARES sent')
  }

  const onVerifyMethod = async (method: PaymentMethodKey) => {
    const result = await verifyMethod(method)

    if (result.ok) {
      toast.success('Checked with Xendit')
      return
    }

    toast.error(result.message ?? 'Xendit refused this method')
  }

  return {
    form,
    settings,
    onSubmit,
    onReset: () => form.reset(),
    onToggleMethod,
    confirming,
    onCancelConfirm: () => setConfirming(null),
    onConfirmMethod,
    onVerifyMethod,
    onSaveDetails,
    onSendAccountProof,
    onConfirmAccount,
    verifying,
    loading: loading && !initialized,
    initialized,
    saving,
    error,
    onRetry: () => void fetchSettings(),
  }
}
