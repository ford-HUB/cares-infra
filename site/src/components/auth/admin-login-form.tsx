import type { UseFormReturn } from 'react-hook-form'
import { ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import { REQUEST_ACCESS_PATH } from '../../constants/routes'
import type { AdminLoginFormValues } from '../../validators/admin-login-schema'
import { ForgotPasswordModal } from './ui/forgot-password-modal'

interface AdminLoginFormProps {
  form: UseFormReturn<AdminLoginFormValues>
  onSubmit: () => void
  loading: boolean
}

export function AdminLoginForm({ form, onSubmit, loading }: AdminLoginFormProps) {
  const [forgotOpen, setForgotOpen] = useState(false)
  const {
    register,
    formState: { errors },
  } = form

  return (
    <>
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--cares-bg)] p-4 sm:p-6">
        <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-[var(--cares-primary)] opacity-10" />
        <div className="pointer-events-none absolute right-0 bottom-0 h-64 w-64 rounded-full bg-[var(--cares-primary-hover)] opacity-15" />

        <div className="relative z-10 w-full max-w-sm">
          <div className="rounded-2xl border border-[var(--cares-border)] bg-white px-5 py-6 shadow-xl">
            <div className="mb-5 text-center">
              <img
                src="/transparent-logo.png"
                alt="CARES"
                className="mx-auto mb-3 h-12 w-12 rounded-full border border-[var(--cares-border)] bg-white object-contain p-1.5 shadow-sm"
              />
              <h1 className="text-lg font-bold text-[var(--cares-heading)]">
                CARES Administrator Portal
              </h1>
              <p className="mt-1 text-xs text-[var(--cares-muted)]">
                Sign in to manage programs, events, and university outreach.
              </p>
            </div>

            <form onSubmit={onSubmit} className="flex flex-col gap-2.5">
              <div>
                <label
                  htmlFor="admin-email"
                  className="mb-0.5 block text-xs font-medium text-gray-700"
                >
                  Email or ID number
                </label>
                <input
                  id="admin-email"
                  type="text"
                  autoComplete="username"
                  placeholder="you@uclm.edu.ph"
                  className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-[var(--cares-primary)] focus:outline-none"
                  {...register('email')}
                />
                {errors.email && (
                  <p className="mt-0.5 text-[10px] text-red-600">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="admin-password"
                  className="mb-0.5 block text-xs font-medium text-gray-700"
                >
                  Password
                </label>
                <input
                  id="admin-password"
                  type="password"
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-[var(--cares-primary)] focus:outline-none"
                  {...register('password')}
                />
                {errors.password && (
                  <p className="mt-0.5 text-[10px] text-red-600">{errors.password.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-[var(--cares-primary)] py-2 text-xs font-semibold text-white transition-colors hover:bg-[var(--cares-primary-hover)] disabled:opacity-60"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>

            <div className="mt-3 text-center">
              <button
                type="button"
                onClick={() => setForgotOpen(true)}
                className="text-xs font-medium text-[var(--cares-primary)] hover:underline"
              >
                Forgot password?
              </button>
            </div>

            <div className="mt-6 border-t border-[var(--cares-border)] pt-5 text-center">
              <div className="mb-2 flex items-center justify-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-[var(--cares-primary)]" />
                <h2 className="text-sm font-semibold text-[var(--cares-heading)]">
                  Need an account?
                </h2>
              </div>
              <p className="mb-3 text-xs text-[var(--cares-muted)]">
                Director and coordinator access requires administrator approval. Submit a
                request with your details and ID verification.
              </p>
              <Link
                to={REQUEST_ACCESS_PATH}
                className="inline-flex w-full items-center justify-center rounded-lg border border-[var(--cares-primary)] bg-[var(--cares-tag-volunteer-bg)] py-2 text-xs font-semibold text-[var(--cares-primary)] transition-colors hover:bg-[var(--cares-primary)] hover:text-white"
              >
                Request access
              </Link>
            </div>
          </div>
        </div>
      </div>

      <ForgotPasswordModal open={forgotOpen} onClose={() => setForgotOpen(false)} />
    </>
  )
}
