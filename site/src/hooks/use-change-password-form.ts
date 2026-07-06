import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { changeAccountPassword } from '../services/account-settings-service'
import {
  changePasswordDefaultValues,
  changePasswordSchema,
  type ChangePasswordFormValues,
} from '../validators/change-password-schema'

export function useChangePasswordForm() {
  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: changePasswordDefaultValues,
  })

  const onSubmit = form.handleSubmit(async (values) => {
    const res = await changeAccountPassword({
      current_password: values.current_password,
      new_password: values.new_password,
    })

    if (res.success) {
      toast.success(res.message)
      form.reset(changePasswordDefaultValues)
      return
    }

    toast.error(res.message)
  })

  return { form, onSubmit, submitting: form.formState.isSubmitting }
}
