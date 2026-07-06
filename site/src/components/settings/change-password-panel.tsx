import type { UseFormReturn } from 'react-hook-form'
import type { ChangePasswordFormValues } from '../../validators/change-password-schema'

interface ChangePasswordPanelProps {
  form: UseFormReturn<ChangePasswordFormValues>
  onSubmit: () => void
  submitting: boolean
}

export function ChangePasswordPanel({ form, onSubmit, submitting }: ChangePasswordPanelProps) {
  const {
    register,
    formState: { errors },
  } = form

  return (
    <section className="rounded-xl border border-gray-300 bg-white p-6">
      <h2 className="text-lg font-semibold text-gray-800">Change password</h2>
      <p className="mt-1 text-sm text-gray-500">
        Choose a strong password with at least 8 characters.
      </p>

      <form onSubmit={onSubmit} className="mt-4 max-w-md space-y-3">
        <div>
          <label htmlFor="current-password" className="mb-0.5 block text-xs font-medium text-gray-700">
            Current password
          </label>
          <input
            id="current-password"
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
          <label htmlFor="new-password" className="mb-0.5 block text-xs font-medium text-gray-700">
            New password
          </label>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-[var(--cares-primary)] focus:outline-none"
            {...register('new_password')}
          />
          {errors.new_password && (
            <p className="mt-0.5 text-xs text-red-600">{errors.new_password.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="confirm-password" className="mb-0.5 block text-xs font-medium text-gray-700">
            Confirm new password
          </label>
          <input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-[var(--cares-primary)] focus:outline-none"
            {...register('confirm_password')}
          />
          {errors.confirm_password && (
            <p className="mt-0.5 text-xs text-red-600">{errors.confirm_password.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-[var(--cares-primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--cares-primary-hover)] disabled:opacity-60"
        >
          {submitting ? 'Saving...' : 'Update password'}
        </button>
      </form>
    </section>
  )
}
