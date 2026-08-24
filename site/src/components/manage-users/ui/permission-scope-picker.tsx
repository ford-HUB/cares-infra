import { RotateCcw } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import type { AccessCatalog, PermissionKey } from '../../../types/access-control'

interface PermissionScopePickerProps {
  catalog: AccessCatalog | null
  loading: boolean
  selected: Set<PermissionKey>
  /** The role's own rights, so a departure from them can be marked as one. */
  baseline: PermissionKey[]
  customised: boolean
  disabled: boolean
  onToggle: (permission: PermissionKey, next: boolean) => void
  onReset: () => void
}

/**
 * The actions a new account will hold, grouped the way the catalog groups them. It
 * starts on the role's baseline; anything ticked or unticked away from that is stored
 * as a per-user override, which is why the departures are called out here.
 */
export function PermissionScopePicker({
  catalog,
  loading,
  selected,
  baseline,
  customised,
  disabled,
  onToggle,
  onReset,
}: PermissionScopePickerProps) {
  if (loading || !catalog) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((row) => (
          <Skeleton key={row} aria-hidden className="h-16 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  const inBaseline = new Set(baseline)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-gray-500">
          {selected.size} of {catalog.permissions.length} actions
          {customised ? ' — changed from the role default' : ' — the role default'}
        </p>

        {customised && (
          <button
            type="button"
            onClick={onReset}
            disabled={disabled}
            className="flex items-center gap-1.5 text-[12px] text-gray-600 hover:text-gray-900 disabled:opacity-50"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Back to role default
          </button>
        )}
      </div>

      {catalog.modules.map((module) => {
        const entries = catalog.permissions.filter((entry) => entry.module === module)
        if (entries.length === 0) return null

        return (
          <section key={module} className="rounded-lg border border-gray-200">
            <header className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-3 py-2">
              <h4 className="text-[13px] font-semibold text-gray-800">{module}</h4>
              <span className="text-[11px] tabular-nums text-gray-500">
                {entries.filter((entry) => selected.has(entry.key)).length}/{entries.length}
              </span>
            </header>

            <ul className="divide-y divide-gray-100">
              {entries.map((entry) => {
                const checked = selected.has(entry.key)
                const departs = checked !== inBaseline.has(entry.key)

                return (
                  <li key={entry.key} className="flex items-start gap-3 px-3 py-2.5">
                    <input
                      id={`scope-${entry.key}`}
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={(event) => onToggle(entry.key, event.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-[var(--cares-primary)] focus:ring-2 focus:ring-[var(--cares-primary)] disabled:opacity-50"
                    />

                    <label htmlFor={`scope-${entry.key}`} className="flex-1 cursor-pointer">
                      <span className="flex flex-wrap items-center gap-1.5 text-[13px] font-medium text-gray-800">
                        {entry.label}
                        {entry.sensitive && (
                          <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                            Sensitive
                          </span>
                        )}
                        {departs && (
                          <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                            {checked ? 'Added' : 'Removed'}
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 block text-[12px] text-gray-500">
                        {entry.description}
                      </span>
                    </label>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
