import { ChevronDown, ChevronRight } from 'lucide-react'
import {
  CREDENTIAL_LIFETIME_OPTIONS,
  PROVISIONABLE_ROLES,
} from '../../../constants/manage-users'
import type { useProvisionUserForm } from '../../../hooks/use-provision-user-form'
import { PermissionScopePicker } from './permission-scope-picker'

type ProvisionUserFieldsProps = Pick<
  ReturnType<typeof useProvisionUserForm>,
  | 'form'
  | 'mode'
  | 'submitting'
  | 'catalog'
  | 'catalogLoading'
  | 'baseline'
  | 'selected'
  | 'scopeCustomised'
  | 'togglePermission'
  | 'resetScope'
> & {
  scopeOpen: boolean
  onScopeOpenChange: (open: boolean) => void
}

const MODE_OPTIONS = [
  {
    value: 'generate',
    title: 'Generate',
    hint: 'The server mints a temporary address.',
  },
  {
    value: 'manual',
    title: 'Manual',
    hint: 'Use the address on the request.',
  },
] as const

const fieldClass =
  'h-9 w-full rounded-lg border border-gray-300 px-3 text-[13px] text-gray-800 focus:border-transparent focus:ring-2 focus:ring-[var(--cares-primary)] focus:outline-none'
const labelClass = 'mb-1 block text-[12px] font-medium text-gray-700'
const errorClass = 'mt-1 text-[12px] text-red-600'

/** The add-user form itself — the dialog around it owns the credential step. */
export function ProvisionUserFields({
  form,
  mode,
  submitting,
  catalog,
  catalogLoading,
  baseline,
  selected,
  scopeCustomised,
  togglePermission,
  resetScope,
  scopeOpen,
  onScopeOpenChange,
}: ProvisionUserFieldsProps) {
  const { errors } = form.formState

  return (
    <>
      <fieldset>
        <legend className={labelClass}>Sign-in email</legend>
        <div className="grid grid-cols-2 gap-2">
          {MODE_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                mode === option.value
                  ? 'border-[var(--cares-primary)] bg-green-50/50'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <span className="flex items-center gap-2">
                <input
                  type="radio"
                  value={option.value}
                  {...form.register('mode')}
                  className="h-3.5 w-3.5 text-[var(--cares-primary)] focus:ring-[var(--cares-primary)]"
                />
                <span className="text-[13px] font-medium text-gray-800">
                  {option.title}
                </span>
              </span>
              <span className="mt-1 block text-[12px] text-gray-500">{option.hint}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {mode === 'manual' && (
        <div>
          <label className={labelClass} htmlFor="provision-email">
            Email
          </label>
          <input
            id="provision-email"
            type="email"
            autoComplete="off"
            placeholder="name@uclm.edu.ph"
            className={fieldClass}
            {...form.register('email')}
          />
          {errors.email && <p className={errorClass}>{errors.email.message}</p>}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass} htmlFor="provision-firstname">
            First name
          </label>
          <input
            id="provision-firstname"
            className={fieldClass}
            {...form.register('firstName')}
          />
          {errors.firstName && <p className={errorClass}>{errors.firstName.message}</p>}
        </div>

        <div>
          <label className={labelClass} htmlFor="provision-lastname">
            Last name
          </label>
          <input
            id="provision-lastname"
            className={fieldClass}
            {...form.register('lastName')}
          />
          {errors.lastName && <p className={errorClass}>{errors.lastName.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass} htmlFor="provision-role">
            Role
          </label>
          <select id="provision-role" className={fieldClass} {...form.register('role')}>
            {PROVISIONABLE_ROLES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass} htmlFor="provision-department">
            Department <span className="text-gray-400">(optional)</span>
          </label>
          <input
            id="provision-department"
            placeholder="CCS"
            className={fieldClass}
            {...form.register('department')}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass} htmlFor="provision-expiry">
            Credentials expire in
          </label>
          <select
            id="provision-expiry"
            className={fieldClass}
            {...form.register('expiresInHours', { valueAsNumber: true })}
          >
            {CREDENTIAL_LIFETIME_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.expiresInHours && (
            <p className={errorClass}>{errors.expiresInHours.message}</p>
          )}
        </div>

        <div>
          <label className={labelClass} htmlFor="provision-phone">
            Phone <span className="text-gray-400">(optional)</span>
          </label>
          <input
            id="provision-phone"
            className={fieldClass}
            {...form.register('phoneNumber')}
          />
          {errors.phoneNumber && <p className={errorClass}>{errors.phoneNumber.message}</p>}
        </div>
      </div>

      <div className="rounded-lg border border-gray-200">
        <button
          type="button"
          onClick={() => onScopeOpenChange(!scopeOpen)}
          aria-expanded={scopeOpen}
          className="flex w-full items-center justify-between px-3 py-2.5 text-left"
        >
          <span>
            <span className="block text-[13px] font-medium text-gray-800">
              Access scope
            </span>
            <span className="mt-0.5 block text-[12px] text-gray-500">
              {scopeCustomised
                ? `${selected.size} actions — changed from the role default`
                : 'Follows the role default'}
            </span>
          </span>
          {scopeOpen ? (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-400" />
          )}
        </button>

        {scopeOpen && (
          <div className="border-t border-gray-100 p-3">
            <PermissionScopePicker
              catalog={catalog}
              loading={catalogLoading}
              selected={selected}
              baseline={[...baseline]}
              customised={scopeCustomised}
              disabled={submitting}
              onToggle={togglePermission}
              onReset={resetScope}
            />
          </div>
        )}
      </div>
    </>
  )
}
