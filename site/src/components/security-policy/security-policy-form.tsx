import { Loader2 } from 'lucide-react'
import type { UseFormReturn } from 'react-hook-form'
import {
  LOCKOUT_ATTEMPTS_MAX,
  LOCKOUT_ATTEMPTS_MIN,
  MAX_CONCURRENT_SESSIONS_CEILING,
  MINUTES_IN_DAY,
  PASSWORD_MIN_LENGTH_CEILING,
  PASSWORD_MIN_LENGTH_FLOOR,
  SESSION_MAX_DURATION_HOURS_CEILING,
  ZERO_MEANS_UNLIMITED,
} from '../../constants/security-policy'
import type { SecurityPolicyFormValues } from '../../validators/security-policy-schema'
import { IpAllowlistField } from './ui/ip-allowlist-field'
import { LoginHoursFields } from './ui/login-hours-fields'
import { PolicyNumberField } from './ui/policy-number-field'
import { PolicySection } from './ui/policy-section'
import { PolicyToggleField } from './ui/policy-toggle-field'

interface SecurityPolicyFormProps {
  form: UseFormReturn<SecurityPolicyFormValues>
  onSubmit: () => void
  onReset: () => void
  saving: boolean
  updatedAt?: string
}

export function SecurityPolicyForm({
  form,
  onSubmit,
  onReset,
  saving,
  updatedAt,
}: SecurityPolicyFormProps) {
  const {
    control,
    register,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = form

  const lockoutEnabled = watch('lockoutEnabled')
  const loginHoursEnabled = watch('loginHoursEnabled')
  const ipAllowlist = watch('ipAllowlist')

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <PolicySection
        title="Passwords"
        description="Applied wherever a password is set — volunteer registration and the portal's change-password form alike. Existing passwords are not affected until they are next changed."
      >
        <PolicyNumberField
          id="password-min-length"
          label="Minimum length"
          min={PASSWORD_MIN_LENGTH_FLOOR}
          max={PASSWORD_MIN_LENGTH_CEILING}
          error={errors.passwordMinLength?.message}
          registration={register('passwordMinLength', { valueAsNumber: true })}
        />

        <div className="space-y-2.5">
          <PolicyToggleField
            id="password-uppercase"
            label="Require an uppercase letter"
            registration={register('passwordRequireUppercase')}
          />
          <PolicyToggleField
            id="password-lowercase"
            label="Require a lowercase letter"
            registration={register('passwordRequireLowercase')}
          />
          <PolicyToggleField
            id="password-number"
            label="Require a number"
            registration={register('passwordRequireNumber')}
          />
          <PolicyToggleField
            id="password-symbol"
            label="Require a symbol"
            registration={register('passwordRequireSymbol')}
          />
        </div>
      </PolicySection>

      <PolicySection
        title="Account lockout"
        description="Stops a password from being guessed by repetition. Applies to portal and mobile sign-ins both."
      >
        <PolicyToggleField
          id="lockout-enabled"
          label="Lock an account after repeated failures"
          registration={register('lockoutEnabled')}
        />

        <div className="flex flex-wrap gap-4">
          <PolicyNumberField
            id="lockout-attempts"
            label="Failed attempts"
            min={LOCKOUT_ATTEMPTS_MIN}
            max={LOCKOUT_ATTEMPTS_MAX}
            disabled={!lockoutEnabled}
            error={errors.lockoutMaxAttempts?.message}
            registration={register('lockoutMaxAttempts', { valueAsNumber: true })}
          />
          <PolicyNumberField
            id="lockout-window"
            label="Within (minutes)"
            min={1}
            max={MINUTES_IN_DAY}
            disabled={!lockoutEnabled}
            error={errors.lockoutWindowMinutes?.message}
            registration={register('lockoutWindowMinutes', { valueAsNumber: true })}
          />
          <PolicyNumberField
            id="lockout-duration"
            label="Locked for (minutes)"
            hint="0 keeps the account locked until an administrator lifts it."
            min={0}
            max={MINUTES_IN_DAY}
            disabled={!lockoutEnabled}
            error={errors.lockoutDurationMinutes?.message}
            registration={register('lockoutDurationMinutes', { valueAsNumber: true })}
          />
        </div>
      </PolicySection>

      <PolicySection
        title="Sessions"
        description="Applied on the next request a signed-in device makes, so tightening these ends sessions that are already open."
      >
        <div className="flex flex-wrap gap-4">
          <PolicyNumberField
            id="session-idle"
            label="Idle timeout (minutes)"
            hint={ZERO_MEANS_UNLIMITED}
            min={0}
            max={MINUTES_IN_DAY}
            error={errors.sessionIdleTimeoutMinutes?.message}
            registration={register('sessionIdleTimeoutMinutes', { valueAsNumber: true })}
          />
          <PolicyNumberField
            id="session-max-duration"
            label="Maximum length (hours)"
            hint={ZERO_MEANS_UNLIMITED}
            min={0}
            max={SESSION_MAX_DURATION_HOURS_CEILING}
            error={errors.sessionMaxDurationHours?.message}
            registration={register('sessionMaxDurationHours', { valueAsNumber: true })}
          />
          <PolicyNumberField
            id="max-concurrent-sessions"
            label="Devices per account"
            hint="0 allows any number. Above it, the oldest device is signed out."
            min={0}
            max={MAX_CONCURRENT_SESSIONS_CEILING}
            error={errors.maxConcurrentSessions?.message}
            registration={register('maxConcurrentSessions', { valueAsNumber: true })}
          />
        </div>
      </PolicySection>

      <PolicySection
        title="Portal access"
        description="Hours and networks describe the office, so they gate the portal only — a volunteer signing in from the field on the mobile app is not affected."
      >
        <PolicyToggleField
          id="login-hours-enabled"
          label="Only allow portal sign-in during set hours"
          registration={register('loginHoursEnabled')}
        />

        <LoginHoursFields
          control={control}
          disabled={!loginHoursEnabled}
          endError={errors.loginHoursEndMinute?.message}
        />

        <IpAllowlistField
          addresses={ipAllowlist}
          onChange={(addresses) =>
            setValue('ipAllowlist', addresses, { shouldDirty: true })
          }
        />
      </PolicySection>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={saving || !isDirty}
          className="flex items-center gap-2 rounded-lg bg-[var(--cares-primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--cares-primary-hover)] disabled:opacity-60"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saving ? 'Saving...' : 'Save policy'}
        </button>

        <button
          type="button"
          onClick={onReset}
          disabled={saving || !isDirty}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          Discard changes
        </button>

        {updatedAt && (
          <span className="text-xs text-gray-500">
            Last saved {new Date(updatedAt).toLocaleString()}
          </span>
        )}
      </div>
    </form>
  )
}
