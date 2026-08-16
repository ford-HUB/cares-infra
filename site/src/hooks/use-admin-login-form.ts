import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { getPostLoginPath } from '../config/auth-redirect'
import { useAuthStore } from '../store/auth-store'
import {
  adminLoginSchema,
  type AdminLoginFormValues,
} from '../validators/admin-login-schema'

export function useAdminLoginForm() {
  const loginUser = useAuthStore((s) => s.login)
  const loading = useAuthStore((s) => s.loading)
  const error = useAuthStore((s) => s.error)
  const clearError = useAuthStore((s) => s.clearError)
  const navigate = useNavigate()

  const form = useForm<AdminLoginFormValues>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    clearError()
    const user = await loginUser({
      email: values.email,
      password: values.password,
    })

    if (user) {
      toast.success('Signed in successfully')
      navigate(getPostLoginPath(user.role))
      return
    }

    const message =
      useAuthStore.getState().error ?? 'Sign in failed. Check your credentials.'
    toast.error(message)
  })

  return { form, onSubmit, loading, error }
}
