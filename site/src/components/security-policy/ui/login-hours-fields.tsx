import { Controller, type Control } from 'react-hook-form'
import { minuteOfDayToTime, timeToMinuteOfDay } from '../../../constants/security-policy'
import type { SecurityPolicyFormValues } from '../../../validators/security-policy-schema'

interface LoginHoursFieldsProps {
  control: Control<SecurityPolicyFormValues>
  disabled: boolean
  endError?: string
}

/**
 * The policy stores minutes since midnight; the inputs speak "HH:mm". `Controller`
 * owns the pair because a `register`ed time input would put the string into the form
 * state the schema expects to be a number.
 */
export function LoginHoursFields({ control, disabled, endError }: LoginHoursFieldsProps) {
  return (
    <div className="flex flex-wrap items-start gap-4">
      {(
        [
          { name: 'loginHoursStartMinute', id: 'login-hours-start', label: 'From' },
          { name: 'loginHoursEndMinute', id: 'login-hours-end', label: 'Until' },
        ] as const
      ).map((field) => (
        <div key={field.name}>
          <label htmlFor={field.id} className="mb-0.5 block text-xs font-medium text-gray-700">
            {field.label}
          </label>
          <Controller
            control={control}
            name={field.name}
            render={({ field: { value, onChange, onBlur, ref } }) => (
              <input
                id={field.id}
                ref={ref}
                type="time"
                disabled={disabled}
                value={minuteOfDayToTime(value)}
                onBlur={onBlur}
                onChange={(event) => onChange(timeToMinuteOfDay(event.target.value))}
                className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-[var(--cares-primary)] focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
              />
            )}
          />
        </div>
      ))}

      <p className="basis-full text-xs text-gray-500">
        A start later than the end spans midnight — 20:00 until 06:00 allows overnight
        sign-ins.
      </p>
      {endError && <p className="basis-full text-xs text-red-600">{endError}</p>}
    </div>
  )
}
