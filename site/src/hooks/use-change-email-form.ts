import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { changeAccountEmail } from '../services/account-settings-service'
import {
  changeEmailDefaultValues,
  changeEmailSchema,
  type ChangeEmailFormValues,
} from '../validators/change-email-schema'

export function useChangeEmailForm(currentEmail?: string) {
  const form = useForm<ChangeEmailFormValues>({
    resolver: zodResolver(changeEmailSchema),
    defaultValues: changeEmailDefaultValues,
  })

  const onSubmit = form.handleSubmit(async (values) => {
    const normalized = values.new_email.trim().toLowerCase()
    if (currentEmail && normalized === currentEmail.toLowerCase()) {
      form.setError('new_email', { message: 'New email must be different' })
      return
    }

    const res = await changeAccountEmail({
      current_password: values.current_password,
      new_email: normalized,
    })

    if (res.success) {
      toast.success(res.message)
      form.reset(changeEmailDefaultValues)
      return
    }

    toast.error(res.message)
  })

  return { form, onSubmit, submitting: form.formState.isSubmitting }
}
