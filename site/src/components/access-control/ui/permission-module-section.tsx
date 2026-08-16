import { AlertTriangle } from 'lucide-react'
import type {
  ActionSuspension,
  PermissionDescriptor,
  PermissionKey,
  PermissionSource,
} from '../../../types/access-control'
import { PermissionSourceBadge } from './rights-badges'

interface PermissionModuleSectionProps {
  module: string
  permissions: PermissionDescriptor[]
  selected: Set<PermissionKey>
  sourceOf: (permission: PermissionKey) => PermissionSource
  suspensionOf: (permission: PermissionKey) => ActionSuspension | undefined
  disabled: boolean
  onToggle: (permission: PermissionKey, next: boolean) => void
  onLiftSuspension: (suspensionId: string) => void
}

/** One module's actions, each with its own toggle, provenance, and suspension notice. */
export function PermissionModuleSection({
  module,
  permissions,
  selected,
  sourceOf,
  suspensionOf,
  disabled,
  onToggle,
  onLiftSuspension,
}: PermissionModuleSectionProps) {
  const grantedCount = permissions.filter((entry) => selected.has(entry.key)).length

  return (
    <section className="rounded-lg border border-gray-200">
      <header className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-3 py-2">
        <h4 className="text-[13px] font-semibold text-gray-800">{module}</h4>
        <span className="text-[11px] tabular-nums text-gray-500">
          {grantedCount}/{permissions.length}
        </span>
      </header>

      <ul className="divide-y divide-gray-100">
        {permissions.map((entry) => {
          const source = sourceOf(entry.key)
          const suspension = suspensionOf(entry.key)
          const checked = selected.has(entry.key)

          return (
            <li key={entry.key} className="px-3 py-2.5">
              <div className="flex items-start gap-3">
                <input
                  id={`permission-${entry.key}`}
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={(event) => onToggle(entry.key, event.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-[var(--cares-primary)] focus:ring-2 focus:ring-[var(--cares-primary)] disabled:opacity-50"
                />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <label
                      htmlFor={`permission-${entry.key}`}
                      className="text-[13px] font-medium text-gray-800"
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

                  <p className="mt-0.5 text-[12px] text-gray-500">{entry.description}</p>

                  {suspension && (
                    <div className="mt-1.5 rounded-md bg-red-50 px-2 py-1.5">
                      <p className="text-[11px] text-red-800">
                        <span className="font-medium">Suspended:</span>{' '}
                        {suspension.reason}
                        {suspension.expiresAt
                          ? ` — until ${new Date(suspension.expiresAt).toLocaleDateString()}`
                          : ' — until lifted'}
                      </p>
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => onLiftSuspension(suspension.id)}
                        className="mt-1 text-[11px] font-medium text-red-700 underline underline-offset-2 hover:text-red-900 disabled:opacity-50"
                      >
                        Lift suspension
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
