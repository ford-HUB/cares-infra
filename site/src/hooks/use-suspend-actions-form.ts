import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { SUSPENSION_DURATIONS } from '../constants/access-control'
import { useAccessControlStore } from '../store/access-control-store'
import {
  suspendActionsSchema,
  type SuspendActionsFormValues,
} from '../validators/suspend-actions-schema'

const defaultValues: SuspendActionsFormValues = {
  permissions: [],
  reason: '',
  durationDays: SUSPENSION_DURATIONS[0].value,
}

/** Converts the preset day count into the ISO expiry the endpoint expects. */
function toExpiry(durationDays: number): string | undefined {
  if (durationDays <= 0) return undefined

  const expiry = new Date()
  expiry.setDate(expiry.getDate() + durationDays)
  return expiry.toISOString()
}

export function useSuspendActionsForm(userId: string | undefined, onDone: () => void) {
  const suspendActions = useAccessControlStore((state) => state.suspendActions)

  const form = useForm<SuspendActionsFormValues>({
    resolver: zodResolver(suspendActionsSchema),
    defaultValues,
  })

  const onSubmit = form.handleSubmit(async (values) => {
    if (!userId) return

    const res = await suspendActions(userId, {
      permissions: values.permissions,
      reason: values.reason.trim(),
      expiresAt: toExpiry(values.durationDays),
    })

    if (res.ok) {
      toast.success(res.message ?? 'Actions suspended')
      form.reset(defaultValues)
      onDone()
      return
    }

    toast.error(res.message ?? 'The suspension could not be applied')
  })

  return { form, onSubmit, submitting: form.formState.isSubmitting }
}
