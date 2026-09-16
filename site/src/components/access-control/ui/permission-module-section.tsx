import { AlertTriangle, ShieldOff } from 'lucide-react'
import type {
  ActionSuspension,
  SessionSuspension,
  PermissionDescriptor,
  PermissionKey,
  PermissionSource,
} from '../../../types/access-control'
import { ModuleToggle } from './module-toggle'
import { PermissionSourceBadge } from './rights-badges'
import { SuspensionTooltip } from '../../portal/ui/suspension-tooltip'

interface PermissionModuleSectionProps {
  module: string
  permissions: PermissionDescriptor[]
  selected: Set<PermissionKey>
  sourceOf: (permission: PermissionKey) => PermissionSource
  suspensionOf: (permission: PermissionKey) => ActionSuspension | undefined
  disabled: boolean
  onToggle: (permission: PermissionKey, next: boolean) => void
  /** The module header's tick — grants or revokes every action listed under it. */
  onToggleAll: (permissions: PermissionKey[], next: boolean) => void
  onLiftSuspension: (suspensionId: string) => void
}

/**
 * One module's actions, each with its own toggle, provenance, and suspension notice,
 * under a header tick that moves the whole module at once.
 *
 * A suspended action stays listed and ticked — the grant is still there underneath —
 * but its toggle is locked and the row reads red. Hovering the row shows the reason
 * and the window; the only thing left to do on it is lift the suspension.
 */
export function PermissionModuleSection({
  module,
  permissions,
  selected,
  sourceOf,
  suspensionOf,
  disabled,
  onToggle,
  onToggleAll,
  onLiftSuspension,
}: PermissionModuleSectionProps) {
  const grantedCount = permissions.filter((entry) => selected.has(entry.key)).length

  const suspensions = permissions.flatMap((entry) => {
    const suspension = suspensionOf(entry.key)
    return suspension ? [{ entry, suspension }] : []
  })
  const suspendedKeys = new Set(suspensions.map(({ entry }) => entry.key))
  const fullySuspended =
    permissions.length > 0 && suspendedKeys.size === permissions.length
  const labelOf = (suspension: SessionSuspension) =>
    permissions.find((entry) => entry.key === suspension.permission)?.label ??
    suspension.permission

  return (
    <section
      className={`rounded-lg border ${
        fullySuspended ? 'border-red-200' : 'border-gray-200'
      }`}
    >
      <SuspensionTooltip
        suspensions={fullySuspended ? suspensions.map((s) => s.suspension) : []}
        labelOf={labelOf}
        side="bottom"
      >
        <header
          className={`flex items-center justify-between border-b px-3 py-2 ${
            fullySuspended ? 'border-red-100 bg-red-50' : 'border-gray-100 bg-gray-50'
          }`}
        >
          <ModuleToggle
            module={module}
            idPrefix="rights"
            permissions={permissions}
            selected={selected}
            suspended={suspendedKeys}
            disabled={disabled}
            onToggleAll={onToggleAll}
          />
          <span className="flex items-center gap-2 text-[11px] tabular-nums">
            {suspendedKeys.size > 0 && (
              <span className="inline-flex items-center gap-1 font-medium text-red-700">
                <ShieldOff className="h-3 w-3" />
                {suspendedKeys.size} suspended
              </span>
            )}
            <span className="text-gray-500">
              {grantedCount}/{permissions.length}
            </span>
          </span>
        </header>
      </SuspensionTooltip>

      <ul className="divide-y divide-gray-100">
        {permissions.map((entry) => {
          const source = sourceOf(entry.key)
          const suspension = suspensionOf(entry.key)
          const checked = selected.has(entry.key)
          const locked = disabled || Boolean(suspension)

          return (
            <SuspensionTooltip
              key={entry.key}
              suspensions={suspension ? [suspension] : []}
              side="left"
            >
              <li
                className={`px-3 py-2.5 ${
                  suspension ? 'cursor-not-allowed bg-red-50/60' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    id={`permission-${entry.key}`}
                    type="checkbox"
                    checked={checked}
                    disabled={locked}
                    onChange={(event) => onToggle(entry.key, event.target.checked)}
                    className={`mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 focus:ring-2 disabled:opacity-50 ${
                      suspension
                        ? 'text-red-600 focus:ring-red-500'
                        : 'text-[var(--cares-primary)] focus:ring-[var(--cares-primary)]'
                    }`}
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <label
                        htmlFor={`permission-${entry.key}`}
                        className={`text-[13px] font-medium ${
                          suspension ? 'text-red-700' : 'text-gray-800'
                        }`}
                      >
                        {entry.label}
                      </label>
                      {entry.sensitive && (
                        <span
                          title="Sensitive action"
                          className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700"
                        >
                          <AlertTriangle className="h-2.5 w-2.5" />
                          Sensitive
                        </span>
                      )}
                      <PermissionSourceBadge source={source} />
                    </div>

                    <p
                      className={`mt-0.5 text-[12px] ${
                        suspension ? 'text-red-600/80' : 'text-gray-500'
                      }`}
                    >
                      {entry.description}
                    </p>

                    {suspension && (
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => onLiftSuspension(suspension.id)}
                        className="mt-1 text-[11px] font-medium text-red-700 underline underline-offset-2 hover:text-red-900 disabled:opacity-50"
                      >
                        Lift suspension
                      </button>
                    )}
                  </div>
                </div>
              </li>
            </SuspensionTooltip>
          )
        })}
      </ul>
    </section>
  )
}
