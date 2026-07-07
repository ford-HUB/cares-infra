import type { UseFormReturn } from 'react-hook-form'
import type { ChangeEmailFormValues } from '../../validators/change-email-schema'

interface ChangeEmailPanelProps {
  form: UseFormReturn<ChangeEmailFormValues>
  onSubmit: () => void
  submitting: boolean
  currentEmail?: string
}

export function ChangeEmailPanel({
  form,
  onSubmit,
  submitting,
  currentEmail,
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

      <form onSubmit={onSubmit} className="mt-4 max-w-md space-y-3">
        <div>
          <label htmlFor="current-password-email" className="mb-0.5 block text-xs font-medium text-gray-700">
            Current password
          </label>
          <input
            id="current-password-email"
            type="password"
            autoComplete="current-password"
            className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-[var(--cares-primary)] focus:outline-none"
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
            className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-[var(--cares-primary)] focus:outline-none"
            {...register('new_email')}
          />
          {errors.new_email && (
            <p className="mt-0.5 text-xs text-red-600">{errors.new_email.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-[var(--cares-primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--cares-primary-hover)] disabled:opacity-60"
        >
          {submitting ? 'Saving...' : 'Update email'}
        </button>
      </form>
    </section>
  )
}
