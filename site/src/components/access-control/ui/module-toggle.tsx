import { useEffect, useRef } from 'react'
import type { PermissionDescriptor, PermissionKey } from '../../../types/access-control'

interface ModuleToggleProps {
  module: string
  /** Keeps the input ids apart when two pickers are mounted on the same page. */
  idPrefix: string
  permissions: PermissionDescriptor[]
  selected: ReadonlySet<PermissionKey>
  disabled: boolean
  /** Receives every key in the module and the state they should all move to. */
  onToggleAll: (permissions: PermissionKey[], next: boolean) => void
}

/**
 * The module-level switch at the top of each permission group: one tick grants the
 * whole module, one untick takes it away, and a half-ticked box shows the module is
 * partly held. Ticking a module is how an admin opens a screen to an account — the
 * portal shows a module when the account holds its "view" right.
 */
export function ModuleToggle({
  module,
  idPrefix,
  permissions,
  selected,
  disabled,
  onToggleAll,
}: ModuleToggleProps) {
  const count = permissions.filter((entry) => selected.has(entry.key)).length
  const all = count === permissions.length && permissions.length > 0
  const some = count > 0 && !all

  // `indeterminate` is a DOM property, not an attribute — React cannot set it in JSX.
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = some
  }, [some])

  const keys = permissions.map((entry) => entry.key)
  const id = `${idPrefix}-module-${module.replace(/\s+/g, '-').toLowerCase()}`

  return (
    <label htmlFor={id} className="flex cursor-pointer items-center gap-2.5">
      <input
        ref={ref}
        id={id}
        type="checkbox"
        checked={all}
        disabled={disabled}
        aria-label={`${all ? 'Revoke' : 'Grant'} every ${module} action`}
        onChange={(event) => onToggleAll(keys, event.target.checked)}
        className="h-4 w-4 shrink-0 rounded border-gray-300 text-[var(--cares-primary)] focus:ring-2 focus:ring-[var(--cares-primary)] disabled:opacity-50"
      />
      <span className="text-[13px] font-semibold text-gray-800">{module}</span>
    </label>
  )
}
