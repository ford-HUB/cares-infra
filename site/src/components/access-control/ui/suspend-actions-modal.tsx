import { Controller } from 'react-hook-form'
import { Loader2 } from 'lucide-react'
import { SUSPENSION_DURATIONS } from '../../../constants/access-control'
import { useSuspendActionsForm } from '../../../hooks/use-suspend-actions-form'
import type {
  AccessUser,
  AccessUserDetail,
  PermissionDescriptor,
} from '../../../types/access-control'
import { grantedPermissions } from '../../../utils/permission-rights'

interface SuspendActionsModalProps {
  user: AccessUser | null
  detail: AccessUserDetail | null
  permissions: PermissionDescriptor[]
  onClose: () => void
}

/**
 * Suspends specific actions after a violation. Only actions the user currently holds
 * are offerable — suspending something they were never granted would be a no-op.
 */
export function SuspendActionsModal({
  user,
  detail,
  permissions,
  onClose,
}: SuspendActionsModalProps) {
  const { form, onSubmit, submitting } = useSuspendActionsForm(user?.id, onClose)

  if (!user || !detail) return null

  const granted = grantedPermissions(detail)
  const suspendable = permissions.filter((entry) => granted.has(entry.key))
  const errors = form.formState.errors

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-xl bg-white shadow-lg">
        <div className="shrink-0 px-6 pt-6">
          <h3 className="text-lg font-semibold text-gray-900">Suspend actions</h3>
          <p className="mt-2 text-sm text-gray-600">
            Temporarily stops{' '}
            <strong>
              {user.firstName} {user.lastName}
            </strong>{' '}
            from using the selected actions. Their underlying rights are kept, so
            lifting the suspension restores them.
          </p>
        </div>

        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
            <fieldset>
              <legend className="text-sm font-medium text-gray-700">
                Actions to suspend
              </legend>

              {suspendable.length === 0 ? (
                <p className="mt-2 rounded-lg bg-gray-50 px-3 py-2 text-[13px] text-gray-500">
                  This account holds no actions that can be suspended.
                </p>
              ) : (
                <Controller
                  control={form.control}
                  name="permissions"
                  render={({ field }) => (
                    <div className="mt-2 space-y-1">
                      {suspendable.map((entry) => (
                        <label
                          key={entry.key}
                          className="flex items-start gap-2.5 rounded-md px-2 py-1.5 hover:bg-gray-50"
                        >
                          <input
                            type="checkbox"
                            checked={field.value.includes(entry.key)}
                            onChange={(event) =>
                              field.onChange(
                                event.target.checked
                                  ? [...field.value, entry.key]
                                  : field.value.filter((key) => key !== entry.key),
                              )
                            }
                            className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-[var(--cares-primary)] focus:ring-2 focus:ring-[var(--cares-primary)]"
                          />
                          <span className="min-w-0">
                            <span className="block text-[13px] font-medium text-gray-800">
                              {entry.module} · {entry.label}
                            </span>
                            <span className="block text-[12px] text-gray-500">
                              {entry.description}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                />
              )}

              {errors.permissions && (
                <p className="mt-1 text-[12px] text-red-600">
                  {errors.permissions.message}
                </p>
              )}
            </fieldset>

            <div>
              <label
                htmlFor="suspend-reason"
                className="block text-sm font-medium text-gray-700"
              >
                Violation / reason
              </label>
              <textarea
                id="suspend-reason"
                rows={3}
                {...form.register('reason')}
                placeholder="What did the account do, and why is this scope being pulled?"
                className="mt-1 w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:border-transparent focus:ring-2 focus:ring-[var(--cares-primary)] focus:outline-none"
              />
              {errors.reason && (
                <p className="mt-1 text-[12px] text-red-600">{errors.reason.message}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="suspend-duration"
                className="block text-sm font-medium text-gray-700"
              >
                Duration
              </label>
              <select
                id="suspend-duration"
                {...form.register('durationDays', { valueAsNumber: true })}
                className="mt-1 h-9 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 focus:border-transparent focus:ring-2 focus:ring-[var(--cares-primary)] focus:outline-none"
              >
                {SUSPENSION_DURATIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex shrink-0 justify-end gap-3 border-t border-gray-200 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || suspendable.length === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
            >
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Suspend
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
