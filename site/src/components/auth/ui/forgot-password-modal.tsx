import { zodResolver } from '@hookform/resolvers/zod'
import { X } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { requestPortalPasswordReset } from '../../../services/forgot-password-service'
import {
  forgotPasswordSchema,
  type ForgotPasswordValues,
} from '../../../validators/forgot-password-schema'

interface ForgotPasswordModalProps {
  open: boolean
  onClose: () => void
}

export function ForgotPasswordModal({ open, onClose }: ForgotPasswordModalProps) {
  const [sent, setSent] = useState(false)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })

  if (!open) return null

  const onSubmit = handleSubmit(async (values) => {
    const res = await requestPortalPasswordReset(values.email)
    if (res.success) {
      setSent(true)
      toast.success(res.message)
      return
    }
    toast.error(res.message)
  })

  const handleClose = () => {
    setSent(false)
    reset()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="w-full max-w-sm rounded-xl border border-[var(--cares-border)] bg-white p-5 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="forgot-password-title"
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 id="forgot-password-title" className="text-lg font-bold text-[var(--cares-heading)]">
              Forgot password
            </h2>
            <p className="mt-1 text-xs text-[var(--cares-muted)]">
              Enter your registered email. We will send reset instructions if an account exists.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-1 text-gray-500 hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {sent ? (
          <div className="rounded-lg bg-[var(--cares-tag-volunteer-bg)] p-3 text-xs text-[var(--cares-tag-volunteer-text)]">
            Check your inbox for password reset instructions. You can close this window.
          </div>
        ) : (
          <form onSubmit={onSubmit} className="flex flex-col gap-2.5">
            <div>
              <label htmlFor="reset-email" className="mb-0.5 block text-xs font-medium text-gray-700">
                Email address
              </label>
              <input
                id="reset-email"
                type="email"
                autoComplete="email"
                className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-[var(--cares-primary)] focus:outline-none"
                {...register('email')}
              />
              {errors.email && (
                <p className="mt-0.5 text-[10px] text-red-600">{errors.email.message}</p>
              )}
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-[var(--cares-primary)] py-2 text-xs font-semibold text-white hover:bg-[var(--cares-primary-hover)] disabled:opacity-60"
            >
              {isSubmitting ? 'Sending...' : 'Send reset link'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
