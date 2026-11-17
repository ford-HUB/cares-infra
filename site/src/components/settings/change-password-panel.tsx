import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import type { UseFormRegisterReturn, UseFormReturn } from 'react-hook-form'
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
        <PasswordField
          id="current-password"
          label="Current password"
          autoComplete="current-password"
          registration={register('current_password')}
          error={errors.current_password?.message}
        />

        <PasswordField
          id="new-password"
          label="New password"
          autoComplete="new-password"
          registration={register('new_password')}
          error={errors.new_password?.message}
        />

        <PasswordField
          id="confirm-password"
          label="Confirm new password"
          autoComplete="new-password"
          registration={register('confirm_password')}
          error={errors.confirm_password?.message}
        />

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

interface PasswordFieldProps {
  id: string
  label: string
  autoComplete: string
  registration: UseFormRegisterReturn
  error?: string
}

function PasswordField({ id, label, autoComplete, registration, error }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)

  return (
    <div>
      <label htmlFor={id} className="mb-0.5 block text-xs font-medium text-gray-700">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          aria-invalid={error ? true : undefined}
          className="w-full rounded-lg border border-gray-300 py-1.5 pr-10 pl-2.5 text-sm focus:ring-2 focus:ring-[var(--cares-primary)] focus:outline-none"
          {...registration}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          aria-pressed={visible}
          aria-controls={id}
          className="absolute top-1/2 right-1.5 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-[var(--cares-muted)] transition-colors hover:bg-gray-100 hover:text-gray-700 focus-visible:ring-2 focus-visible:ring-[var(--cares-primary)] focus-visible:outline-none"
        >
          {visible ? <EyeOff aria-hidden className="h-4 w-4" /> : <Eye aria-hidden className="h-4 w-4" />}
        </button>
      </div>
      {error && <p className="mt-0.5 text-xs text-red-600">{error}</p>}
    </div>
  )
}
