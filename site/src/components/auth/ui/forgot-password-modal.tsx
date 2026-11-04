import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { requestPortalPasswordReset } from '../../../services/forgot-password-service'
import {
  forgotPasswordSchema,
  type ForgotPasswordValues,
} from '../../../validators/forgot-password-schema'
import { AuthModal, AuthModalTitle } from './auth-modal'

interface ForgotPasswordModalProps {
  open: boolean
  onClose: () => void
}

export function ForgotPasswordModal({ open, onClose }: ForgotPasswordModalProps) {
  const [sentTo, setSentTo] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    const res = await requestPortalPasswordReset(values.email)
    if (res.success) {
      setSentTo(values.email)
      toast.success(res.message)
      return
    }
    toast.error(res.message)
  })

  const handleClose = () => {
    setSentTo(null)
    reset()
    onClose()
  }

  return (
    <AuthModal open={open} onClose={handleClose}>
      <div className="p-5">
        <div className="mb-4 pr-6">
          <AuthModalTitle className="text-lg font-bold text-[var(--cares-heading)]">
            Forgot password
          </AuthModalTitle>
          <p className="mt-1 text-xs text-[var(--cares-muted)]">
            Enter your registered email. We will email you a new temporary password if an account exists.
          </p>
        </div>

        {sentTo ? (
          <div className="flex flex-col gap-3">
            <div className="rounded-lg bg-[var(--cares-tag-volunteer-bg)] p-3 text-xs text-[var(--cares-tag-volunteer-text)]">
              A new temporary password was sent to <strong>{sentTo}</strong>. Sign in with it,
              then change it right away under <strong>Settings &rarr; Change password</strong>.
            </div>
            <button
              type="button"
              onClick={() => setSentTo(null)}
              className="text-xs font-medium text-[var(--cares-primary)] hover:underline"
            >
              Didn't get it? Send another temporary password
            </button>
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
                className="w-full rounded-lg border border-gray-300 bg-white/80 px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-[var(--cares-primary)] focus:outline-none"
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
              {isSubmitting ? 'Sending...' : 'Send Temporary Password'}
            </button>
          </form>
        )}
      </div>
    </AuthModal>
  )
}
