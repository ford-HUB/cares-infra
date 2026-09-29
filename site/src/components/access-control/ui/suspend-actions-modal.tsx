import { Controller } from 'react-hook-form'
import { Loader2, ShieldOff } from 'lucide-react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { SUSPENSION_DURATIONS } from '../../../constants/access-control'
import { useSuspendActionsForm } from '../../../hooks/use-suspend-actions-form'
import type {
  AccessUser,
  AccessUserDetail,
  SessionSuspension,
  PermissionDescriptor,
} from '../../../types/access-control'
import { activeSuspensionOf, grantedPermissions } from '../../../utils/permission-rights'
import { SuspensionTooltip } from '../../portal/ui/suspension-tooltip'

interface SuspendActionsModalProps {
  user: AccessUser | null
  detail: AccessUserDetail | null
  permissions: PermissionDescriptor[]
  onClose: () => void
}

/**
 * Suspends specific actions after a violation. Only actions the user currently holds
 * are offerable — suspending something they were never granted would be a no-op.
 *
 * Actions already under suspension stay in the list so the admin sees the full
 * picture of the module, but they are locked and read red; hovering one shows the
 * reason and window of the suspension in force.
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
  const held = permissions.filter((entry) => granted.has(entry.key))
  const suspensionOf = (entry: PermissionDescriptor) =>
    activeSuspensionOf(entry.key, detail)
  const suspendable = held.filter((entry) => !suspensionOf(entry))
  const labelOf = (suspension: SessionSuspension) =>
    permissions.find((entry) => entry.key === suspension.permission)?.label ??
    suspension.permission

  const byModule = held.reduce<{ module: string; entries: PermissionDescriptor[] }[]>(
    (groups, entry) => {
      const group = groups.find((item) => item.module === entry.module)
      if (group) {
        group.entries.push(entry)
      } else {
        groups.push({ module: entry.module, entries: [entry] })
      }
      return groups
    },
    [],
  )
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
            from using the selected actions. Their underlying rights are kept, so lifting
            the suspension restores them.
          </p>
        </div>

        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
            <fieldset>
              <legend className="text-sm font-medium text-gray-700">
                Actions to suspend
              </legend>

              {held.length === 0 ? (
                <p className="mt-2 rounded-lg bg-gray-50 px-3 py-2 text-[13px] text-gray-500">
                  This account holds no actions that can be suspended.
                </p>
              ) : (
                <Controller
                  control={form.control}
                  name="permissions"
                  render={({ field }) => (
                    <TooltipProvider delayDuration={150}>
                      <div className="mt-2 space-y-2">
                        {byModule.map((group) => {
                          const groupSuspensions = group.entries.flatMap((entry) => {
                            const suspension = suspensionOf(entry)
                            return suspension ? [suspension] : []
                          })
                          const fullySuspended =
                            groupSuspensions.length === group.entries.length

                          return (
                            <div
                              key={group.module}
                              className={`rounded-lg border ${
                                fullySuspended ? 'border-red-200' : 'border-gray-200'
                              }`}
                            >
                              <SuspensionTooltip
                                suspensions={fullySuspended ? groupSuspensions : []}
                                labelOf={labelOf}
                                side="bottom"
                              >
                                <div
                                  className={`flex items-center justify-between border-b px-3 py-1.5 ${
                                    fullySuspended
                                      ? 'cursor-not-allowed border-red-100 bg-red-50'
                                      : 'border-gray-100 bg-gray-50'
                                  }`}
                                >
                                  <span
                                    className={`text-[12px] font-semibold ${
                                      fullySuspended ? 'text-red-700' : 'text-gray-800'
                                    }`}
                                  >
                                    {group.module}
                                  </span>
                                  {groupSuspensions.length > 0 && (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-700">
                                      <ShieldOff className="h-3 w-3" />
                                      {fullySuspended
                                        ? 'Module suspended'
                                        : `${groupSuspensions.length} suspended`}
                                    </span>
                                  )}
                                </div>
                              </SuspensionTooltip>

                              <div className="divide-y divide-gray-100">
                                {group.entries.map((entry) => {
                                  const suspension = suspensionOf(entry)

                                  return (
                                    <SuspensionTooltip
                                      key={entry.key}
                                      suspensions={suspension ? [suspension] : []}
                                      side="left"
                                    >
                                      <label
                                        className={`flex items-start gap-2.5 px-3 py-1.5 ${
                                          suspension
                                            ? 'cursor-not-allowed bg-red-50/60'
                                            : 'hover:bg-gray-50'
                                        }`}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={
                                            Boolean(suspension) ||
                                            field.value.includes(entry.key)
                                          }
                                          disabled={Boolean(suspension)}
                                          onChange={(event) =>
                                            field.onChange(
                                              event.target.checked
                                                ? [...field.value, entry.key]
                                                : field.value.filter(
                                                    (key) => key !== entry.key,
                                                  ),
                                            )
                                          }
                                          className={`mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 focus:ring-2 disabled:opacity-50 ${
                                            suspension
                                              ? 'text-red-600 focus:ring-red-500'
                                              : 'text-[var(--cares-primary)] focus:ring-[var(--cares-primary)]'
                                          }`}
                                        />
                                        <span className="min-w-0">
                                          <span
                                            className={`block text-[13px] font-medium ${
                                              suspension
                                                ? 'text-red-700'
                                                : 'text-gray-800'
                                            }`}
                                          >
                                            {entry.label}
                                          </span>
                                          <span
                                            className={`block text-[12px] ${
                                              suspension
                                                ? 'text-red-600/80'
                                                : 'text-gray-500'
                                            }`}
                                          >
                                            {entry.description}
                                          </span>
                                        </span>
                                      </label>
                                    </SuspensionTooltip>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </TooltipProvider>
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
