import { useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { EDITABLE_BASELINE_ROLES } from '../../../constants/access-control'
import type { AccessCatalog, PermissionKey } from '../../../types/access-control'

interface RoleBaselinesModalProps {
  open: boolean
  catalog: AccessCatalog | null
  saving: boolean
  onClose: () => void
  onSave: (role: string, permissions: PermissionKey[]) => void
}

/**
 * Edits what a role grants by default. Admin is absent on purpose — the server treats
 * that baseline as fixed, so offering it here would only produce a rejected request.
 */
export function RoleBaselinesModal({
  open,
  catalog,
  saving,
  onClose,
  onSave,
}: RoleBaselinesModalProps) {
  const [role, setRole] = useState(EDITABLE_BASELINE_ROLES[0])

  const stored = useMemo(
    () =>
      new Set(catalog?.roles.find((entry) => entry.role === role)?.permissions ?? []),
    [catalog, role],
  )

  const [selected, setSelected] = useState<Set<PermissionKey>>(stored)
  const [syncedStored, setSyncedStored] = useState(stored)

  // Switching role tab, or a saved baseline arriving, reseeds the draft. Adjusting
  // during render rather than in an effect avoids a cascading re-render.
  if (syncedStored !== stored) {
    setSyncedStored(stored)
    setSelected(new Set(stored))
  }

  if (!open) return null

  const dirty =
    selected.size !== stored.size ||
    [...selected].some((permission) => !stored.has(permission))

  const groups =
    catalog?.modules.map((module) => ({
      module,
      permissions: catalog.permissions.filter((entry) => entry.module === module),
    })) ?? []

  const toggle = (permission: PermissionKey, next: boolean) => {
    setSelected((current) => {
      const updated = new Set(current)
      if (next) {
        updated.add(permission)
      } else {
        updated.delete(permission)
      }
      return updated
    })
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-lg">
        <div className="shrink-0 border-b border-gray-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-900">Role baselines</h3>
          <p className="mt-1 text-sm text-gray-600">
            Sets what every account of a role inherits. Accounts with their own
            overrides keep them; everyone else moves with this change.
          </p>

          <div className="mt-3 flex items-center gap-2">
            {EDITABLE_BASELINE_ROLES.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setRole(option)}
                className={`rounded-lg px-3 py-1.5 text-[13px] font-medium capitalize ${
                  option === role
                    ? 'bg-[var(--cares-primary)] text-white'
                    : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-6 py-4">
          {groups.map((group) => (
            <section key={group.module} className="rounded-lg border border-gray-200">
              <header className="border-b border-gray-100 bg-gray-50 px-3 py-2">
                <h4 className="text-[13px] font-semibold text-gray-800">
                  {group.module}
                </h4>
              </header>
              <ul className="divide-y divide-gray-100">
                {group.permissions.map((entry) => (
                  <li key={entry.key}>
                    <label className="flex items-start gap-2.5 px-3 py-2 hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={selected.has(entry.key)}
                        disabled={saving}
                        onChange={(event) => toggle(entry.key, event.target.checked)}
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-[var(--cares-primary)] focus:ring-2 focus:ring-[var(--cares-primary)] disabled:opacity-50"
                      />
                      <span className="min-w-0">
                        <span className="block text-[13px] font-medium text-gray-800">
                          {entry.label}
                        </span>
                        <span className="block text-[12px] text-gray-500">
                          {entry.description}
                        </span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </section>
          ))}
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
            type="button"
            disabled={!dirty || saving}
            onClick={() => onSave(role, [...selected])}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--cares-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Save baseline
          </button>
        </div>
      </div>
    </div>
  )
}
