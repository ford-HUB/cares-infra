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

/** Drops fields the server reports but won't accept back. */
function toFormValues(settings: PaymentSettingsDetail): PaymentSettingsFormValues {
  return {
    mode: settings.mode,
    enabled: settings.enabled,
    // Not edited here; the server replaces the whole row on save.
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

  /** Enabling a channel asks the gateway to activate it, so it needs confirming. */
  const [confirming, setConfirming] = useState<PaymentMethodKey | null>(null)

  const form = useForm<PaymentSettingsFormValues>({
    resolver: zodResolver(paymentSettingsSchema),
    defaultValues: paymentSettingsDefaultValues,
  })

  useEffect(() => {
    void fetchSettings()
  }, [fetchSettings])

  /** Reset, not set, so `isDirty` means "differs from stored". */
  useEffect(() => {
    if (!settings) return

    form.reset(toFormValues(settings))
  }, [settings, form])

  // Omitted secrets leave the stored ones alone.
  const save = async (message: string) => {
    // Bypasses `handleSubmit`, so run the account rules by hand.
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

  /** Server runs the activation check on save; the card returns its verdict. */
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

    if (checked?.verification === 'PENDING') {
      toast('Waiting for the Xendit account before this can take payments', {
        icon: '\u23F3',
      })
    } else if (checked?.verification === 'FAILED') {
      toast.error(checked.verificationMessage ?? 'Xendit refused this method')
    }
  }

  const onSaveDetails = async () => {
    await save('Account details saved')
  }

  /** Save first: the payout goes to the saved number. */
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
