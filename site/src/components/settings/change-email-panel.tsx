import { Lock } from 'lucide-react'
import type { UseFormReturn } from 'react-hook-form'
import type { ChangeEmailFormValues } from '../../validators/change-email-schema'

interface ChangeEmailPanelProps {
  form: UseFormReturn<ChangeEmailFormValues>
  onSubmit: () => void
  submitting: boolean
  currentEmail?: string
  /** The root operator account — the server refuses to change its sign-in email. */
  locked?: boolean
}

export function ChangeEmailPanel({
  form,
  onSubmit,
  submitting,
  currentEmail,
  locked = false,
}: ChangeEmailPanelProps) {
  const {
    register,
    formState: { errors },
  } = form

  return (
    <section className="rounded-xl border border-gray-300 bg-white p-6">
      <h2 className="text-lg font-semibold text-gray-800">Change email</h2>
      <p className="mt-1 text-sm text-gray-500">
        Update the email address used to sign in to the portal.
      </p>
      {currentEmail && (
        <p className="mt-2 text-xs text-gray-500">
          Current email: <span className="font-medium text-gray-700">{currentEmail}</span>
        </p>
      )}

      {locked && (
        <p className="mt-4 flex max-w-md items-start gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
          <Lock aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            This is the root administrator account. Its sign-in email is fixed so the
            portal can never be left without a reachable administrator.
          </span>
        </p>
      )}

      <form onSubmit={onSubmit} className="mt-4 max-w-md space-y-3">
        <div>
          <label htmlFor="current-password-email" className="mb-0.5 block text-xs font-medium text-gray-700">
            Current password
          </label>
          <input
            id="current-password-email"
            type="password"
            autoComplete="current-password"
            disabled={locked}
            className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-[var(--cares-primary)] focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
            {...register('current_password')}
          />
          {errors.current_password && (
            <p className="mt-0.5 text-xs text-red-600">{errors.current_password.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="new-email" className="mb-0.5 block text-xs font-medium text-gray-700">
            New email
          </label>
          <input
            id="new-email"
            type="email"
            autoComplete="email"
            disabled={locked}
            className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-[var(--cares-primary)] focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
            {...register('new_email')}
          />
          {errors.new_email && (
            <p className="mt-0.5 text-xs text-red-600">{errors.new_email.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting || locked}
          className="rounded-lg bg-[var(--cares-primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--cares-primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Saving...' : 'Update email'}
        </button>
      </form>
    </section>
  )
}
