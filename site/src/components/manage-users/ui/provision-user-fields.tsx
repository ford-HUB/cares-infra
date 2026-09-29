import { CheckCircle2, ChevronDown, ChevronRight, CircleAlert, Loader2 } from 'lucide-react'
import {
  CREDENTIAL_LIFETIME_OPTIONS,
  PROVISIONABLE_DEPARTMENTS,
  PROVISIONABLE_ROLES,
} from '../../../constants/manage-users'
import type {
  RecipientEmailCheck,
  useProvisionUserForm,
} from '../../../hooks/use-provision-user-form'
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
  | 'togglePermissions'
  | 'resetScope'
  | 'recipientCheck'
  | 'checkRecipientEmail'
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

/** The inline verdict beside the recipient field — one glyph per state, nothing while idle. */
function RecipientCheckIndicator({ check }: { check: RecipientEmailCheck }) {
  if (check.status === 'idle') return null

  const glyph = {
    checking: <Loader2 className="h-4 w-4 animate-spin text-gray-400" />,
    valid: <CheckCircle2 className="h-4 w-4 text-[var(--cares-primary)]" />,
    invalid: <CircleAlert className="h-4 w-4 text-red-500" />,
  }[check.status]

  return (
    <span
      aria-live="polite"
      className="pointer-events-none absolute inset-y-0 right-3 flex items-center"
    >
      {glyph}
    </span>
  )
}

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
  togglePermissions,
  resetScope,
  recipientCheck,
  checkRecipientEmail,
  scopeOpen,
  onScopeOpenChange,
}: ProvisionUserFieldsProps) {
  const { errors } = form.formState
  const recipientField = form.register('recipientEmail')

  // The schema error (shape) and the server verdict (deliverability, duplicates) land
  // in different places; whichever is present is the one to show, never both.
  const recipientError =
    errors.recipientEmail?.message ??
    (recipientCheck.status === 'invalid' ? recipientCheck.message : undefined)

  return (
    <>
      <div>
        <label className={labelClass} htmlFor="provision-recipient">
          Send credentials to
        </label>
        <div className="relative">
          <input
            id="provision-recipient"
            type="email"
            autoComplete="off"
            placeholder="name@uclm.edu.ph"
            aria-invalid={Boolean(recipientError)}
            className={`${fieldClass} pr-9 ${
              recipientError ? 'border-red-400' : ''
            } ${recipientCheck.status === 'valid' ? 'border-[var(--cares-primary)]' : ''}`}
            {...recipientField}
            onBlur={(event) => {
              void recipientField.onBlur(event)
              void checkRecipientEmail()
            }}
          />
          <RecipientCheckIndicator check={recipientCheck} />
        </div>
        {recipientError ? (
          <p className={errorClass}>{recipientError}</p>
        ) : (
          <p className="mt-1 text-[12px] text-gray-500">
            {recipientCheck.status === 'valid'
              ? 'This inbox can receive the temporary account details.'
              : recipientCheck.status === 'checking'
                ? 'Checking the address…'
                : 'The temporary account details are emailed here once created.'}
          </p>
        )}
      </div>

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
          <select
            id="provision-department"
            className={fieldClass}
            {...form.register('department')}
          >
            <option value="">No department</option>
            {PROVISIONABLE_DEPARTMENTS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.department && <p className={errorClass}>{errors.department.message}</p>}
        </div>
      </div>

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
              onToggleAll={togglePermissions}
              onReset={resetScope}
            />
          </div>
        )}
      </div>
    </>
  )
}
