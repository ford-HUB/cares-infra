import { useEffect, useRef } from 'react'
import type { PermissionDescriptor, PermissionKey } from '../../../types/access-control'

interface ModuleToggleProps {
  module: string
  /** Keeps the input ids apart when two pickers are mounted on the same page. */
  idPrefix: string
  permissions: PermissionDescriptor[]
  selected: ReadonlySet<PermissionKey>
  /**
   * Actions under suspension. They stay ticked (the grant is kept) but the header
   * never moves them, and once every action is suspended the header locks and reads red.
   */
  suspended?: ReadonlySet<PermissionKey>
  disabled: boolean
  /** Receives every movable key in the module and the state they should all move to. */
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
  suspended,
  disabled,
  onToggleAll,
}: ModuleToggleProps) {
  const count = permissions.filter((entry) => selected.has(entry.key)).length
  const all = count === permissions.length && permissions.length > 0
  const some = count > 0 && !all

  const movable = permissions.filter((entry) => !suspended?.has(entry.key))
  const fullySuspended = permissions.length > 0 && movable.length === 0

  // `indeterminate` is a DOM property, not an attribute — React cannot set it in JSX.
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = some
  }, [some])

  const keys = movable.map((entry) => entry.key)
  const id = `${idPrefix}-module-${module.replace(/\s+/g, '-').toLowerCase()}`

  return (
    <label
      htmlFor={id}
      className={`flex items-center gap-2.5 ${
        fullySuspended ? 'cursor-not-allowed' : 'cursor-pointer'
      }`}
    >
      <input
        ref={ref}
        id={id}
        type="checkbox"
        checked={all}
        disabled={disabled || fullySuspended}
        aria-label={
          fullySuspended
            ? `Every ${module} action is suspended`
            : `${all ? 'Revoke' : 'Grant'} every ${module} action`
        }
        onChange={(event) => onToggleAll(keys, event.target.checked)}
        className={`h-4 w-4 shrink-0 rounded border-gray-300 focus:ring-2 disabled:opacity-50 ${
          fullySuspended
            ? 'text-red-600 focus:ring-red-500'
            : 'text-[var(--cares-primary)] focus:ring-[var(--cares-primary)]'
        }`}
      />
      <span
        className={`text-[13px] font-semibold ${
          fullySuspended ? 'text-red-700' : 'text-gray-800'
        }`}
      >
        {module}
      </span>
    </label>
  )
}
