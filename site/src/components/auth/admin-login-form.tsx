import type { UseFormReturn } from 'react-hook-form'
import { Lock, ShieldCheck, User } from 'lucide-react'
import { useState } from 'react'
import type { AdminLoginFormValues } from '../../validators/admin-login-schema'
import { cn } from '@/lib/utils'
import { AuthModalHeader } from './ui/auth-modal-header'
import { modalReveal } from './ui/modal-reveal'
import { ForgotPasswordModal } from './ui/forgot-password-modal'

interface AdminLoginFormProps {
  form: UseFormReturn<AdminLoginFormValues>
  onSubmit: () => void
  loading: boolean
  /** The first session check is still running. */
  checking: boolean
  onRequestAccess: () => void
}

const INPUT_CLASS =
  'w-full rounded-lg border border-gray-300 bg-white/80 py-2 pr-3 pl-9 text-sm focus:ring-2 focus:ring-[var(--cares-primary)] focus:outline-none'

const INPUT_ICON_CLASS =
  'pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--cares-muted)]'

function submitLabel(checking: boolean, loading: boolean) {
  if (checking) return 'Checking session...'
  if (loading) return 'Signing in...'
  return 'Sign in'
}

/** Sign-in card body; it sits inside the auth modal over the landing page. */
export function AdminLoginForm({
  form,
  onSubmit,
  loading,
  checking,
  onRequestAccess,
}: AdminLoginFormProps) {
  const [forgotOpen, setForgotOpen] = useState(false)
  const {
    register,
    formState: { errors },
  } = form

  return (
    <>
      <div className="px-5 py-6">
        <AuthModalHeader
          title="Administrator Portal"
          description="Sign in to manage programs, events, and university outreach."
          dividerLabel="Portal sign-in"
        />

        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <div {...modalReveal(3)}>
            <label htmlFor="admin-email" className="mb-1 block text-sm font-medium text-gray-700">
              Email or ID number
            </label>
            <div className="relative">
              <User aria-hidden className={INPUT_ICON_CLASS} />
              <input
                id="admin-email"
                type="text"
                autoComplete="username"
                placeholder="you@uclm.edu.ph"
                className={INPUT_CLASS}
                {...register('email')}
              />
            </div>
            {errors.email && (
              <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
            )}
          </div>

          <div {...modalReveal(4)}>
            <label
              htmlFor="admin-password"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <div className="relative">
              <Lock aria-hidden className={INPUT_ICON_CLASS} />
              <input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                className={INPUT_CLASS}
                {...register('password')}
              />
            </div>
            {errors.password && (
              <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || checking}
            style={modalReveal(5).style}
            className={cn(
              'w-full rounded-lg bg-[var(--cares-primary)] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--cares-primary-hover)] disabled:opacity-60',
              modalReveal(5).className,
            )}
          >
            {submitLabel(checking, loading)}
          </button>
        </form>

        <div
          className={cn('mt-2 text-right', modalReveal(6).className)}
          style={modalReveal(6).style}
        >
          <button
            type="button"
            onClick={() => setForgotOpen(true)}
            className="text-sm font-medium text-[var(--color-primary)] hover:underline"
          >
            Forgot password?
          </button>
        </div>

        <div className="mt-4 border-t border-[var(--cares-border)] pt-4 text-center">
          <div
            className={cn(
              'mb-1 flex items-center justify-center gap-1.5',
              modalReveal(7, 'heading').className,
            )}
            style={modalReveal(7, 'heading').style}
          >
            <ShieldCheck className="h-4 w-4 text-[var(--cares-primary)]" />
            <h2 className="text-base font-semibold text-[var(--cares-heading)]">Need an account?</h2>
          </div>
          <p
            className={cn('mb-3 text-sm text-[var(--cares-muted)]', modalReveal(8).className)}
            style={modalReveal(8).style}
          >
            Submit a request with your details and ID verification.
          </p>
          <button
            type="button"
            onClick={onRequestAccess}
            style={modalReveal(9).style}
            className={cn(modalReveal(9).className, 'inline-flex w-full items-center justify-center rounded-lg border border-[var(--cares-primary)] bg-[var(--cares-tag-volunteer-bg)] py-2.5 text-sm font-semibold text-[var(--cares-primary)] transition-colors hover:bg-[var(--cares-primary)] hover:text-white')}
          >
            Request access
          </button>
        </div>
      </div>

      <ForgotPasswordModal open={forgotOpen} onClose={() => setForgotOpen(false)} />
    </>
  )
}
