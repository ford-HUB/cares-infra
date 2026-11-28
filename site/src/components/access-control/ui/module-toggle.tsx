import { useEffect, useRef } from 'react'
import type { PermissionDescriptor, PermissionKey } from '../../../types/access-control'

interface ModuleToggleProps {
  module: string
  /** Keeps input ids unique when two pickers are mounted. */
  idPrefix: string
  permissions: PermissionDescriptor[]
  selected: ReadonlySet<PermissionKey>
  /** Stay ticked but never move with the header; all suspended locks the header. */
  suspended?: ReadonlySet<PermissionKey>
  disabled: boolean
  onToggleAll: (permissions: PermissionKey[], next: boolean) => void
}

/** The portal shows a module when the account holds its "view" right. */
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
