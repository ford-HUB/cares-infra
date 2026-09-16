import { useMemo, useState } from 'react'
import { Loader2, ShieldOff, X } from 'lucide-react'
import { TooltipProvider } from '@/components/ui/tooltip'
import type {
  AccessCatalog,
  AccessUser,
  AccessUserDetail,
  PermissionKey,
} from '../../../types/access-control'
import {
  activeSuspensionOf,
  grantedPermissions,
  hasPendingChanges,
  permissionSource,
  suspendedPermissions,
} from '../../../utils/permission-rights'
import { UserAvatar } from '../../portal/ui/user-avatar'
import { AccessRightsPanelSkeleton } from './access-rights-panel-skeleton'
import { PermissionModuleSection } from './permission-module-section'

interface AccessRightsPanelProps {
  user: AccessUser | null
  detail: AccessUserDetail | null
  catalog: AccessCatalog | null
  loading: boolean
  error?: string
  saving: boolean
  /**
   * The account may see rights but not change them — every toggle is frozen and the
   * footer offers no save, reset, or suspend. This is the "View rights" right on its
   * own, without "Manage rights".
   */
  readOnly?: boolean
  onClose: () => void
  onSave: (permissions: PermissionKey[]) => void
  onSuspend: () => void
  onLiftSuspension: (suspensionId: string) => void
}

export function AccessRightsPanel({
  user,
  detail,
  catalog,
  loading,
  error,
  saving,
  readOnly = false,
  onClose,
  onSave,
  onSuspend,
  onLiftSuspension,
}: AccessRightsPanelProps) {
  const granted = useMemo(
    () => (detail ? grantedPermissions(detail) : new Set<PermissionKey>()),
    [detail],
  )
  const suspended = useMemo(
    () => (detail ? suspendedPermissions(detail) : new Set<PermissionKey>()),
    [detail],
  )

  const [selected, setSelected] = useState<Set<PermissionKey>>(granted)
  const [syncedGranted, setSyncedGranted] = useState(granted)

  // Reset the draft whenever a new detail payload lands — including after a save,
  // where the server's recomputed grant becomes the new baseline for the form.
  // Adjusting during render rather than in an effect avoids a cascading re-render.
  if (syncedGranted !== granted) {
    setSyncedGranted(granted)
    setSelected(new Set(granted))
  }

  const byModule = useMemo(() => {
    if (!catalog) return []
    return catalog.modules.map((module) => ({
      module,
      permissions: catalog.permissions.filter((entry) => entry.module === module),
    }))
  }, [catalog])

  if (!user) return null

  const dirty = hasPendingChanges(selected, granted)
  const activeSuspensions = detail?.suspensions.filter((entry) => entry.active) ?? []

  const toggle = (permission: PermissionKey, next: boolean) =>
    toggleMany([permission], next)

  // A suspended action's toggle is locked in the UI; skipping it here keeps a module
  // tick from moving it either.
  const toggleMany = (permissions: PermissionKey[], next: boolean) => {
    setSelected((current) => {
      const updated = new Set(current)
      for (const permission of permissions) {
        if (suspended.has(permission)) continue
        if (next) {
          updated.add(permission)
        } else {
          updated.delete(permission)
        }
      }
      return updated
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50">
      <aside
        role="dialog"
        aria-label={`Access rights for ${user.firstName} ${user.lastName}`}
        className="flex h-full w-full max-w-xl flex-col bg-white shadow-xl"
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-200 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <UserAvatar firstName={user.firstName} lastName={user.lastName} size="lg" />
            <div className="min-w-0">
              <h3 className="truncate text-base font-semibold text-gray-900">
                {user.firstName} {user.lastName}
              </h3>
              <p className="truncate text-[12px] text-gray-500">{user.email}</p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-700 capitalize">
                  {user.role}
                </span>
                {user.isProtected && (
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700">
                    Root account
                  </span>
                )}
                {user.isRestricted && (
                  <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] text-red-700">
                    Account restricted
                  </span>
                )}
                {activeSuspensions.length > 0 && (
                  <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] text-red-700">
                    {activeSuspensions.length} action
                    {activeSuspensions.length === 1 ? '' : 's'} suspended
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {loading && <AccessRightsPanelSkeleton />}

          {!loading && error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-800">
              {error}
            </p>
          )}

          {!loading && !error && detail && (
            <>
              {readOnly && (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
                  You can view this account's rights but not change them — that needs the
                  "Manage rights" right on your own account.
                </p>
              )}

              <p className="rounded-lg bg-gray-50 px-3 py-2 text-[12px] text-gray-600">
                Ticked actions are what this account can do. Tick a module heading to
                grant the whole module, or untick it to remove the module from this
                person's portal. Unticking an action inherited from the{' '}
                <span className="capitalize">{user.role}</span> role revokes it for this
                person only; suspensions sit on top and are lifted separately.
              </p>

              <TooltipProvider delayDuration={150}>
                {byModule.map((group) => (
                  <PermissionModuleSection
                    key={group.module}
                    module={group.module}
                    permissions={group.permissions}
                    selected={selected}
                    disabled={saving || readOnly}
                    sourceOf={(permission) =>
                      permissionSource(permission, detail, granted, suspended)
                    }
                    suspensionOf={(permission) => activeSuspensionOf(permission, detail)}
                    onToggle={toggle}
                    onToggleAll={toggleMany}
                    onLiftSuspension={onLiftSuspension}
                  />
                ))}
              </TooltipProvider>
            </>
          )}
        </div>

        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-gray-200 bg-gray-50 px-5 py-3">
          <button
            type="button"
            disabled={!detail || saving || user.isProtected || readOnly}
            onClick={onSuspend}
            title={
              user.isProtected
                ? 'The root administrator account cannot have its actions suspended'
                : undefined
            }
            className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-[13px] font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ShieldOff className="h-3.5 w-3.5" />
            Suspend actions
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!dirty || saving || readOnly}
              onClick={() => setSelected(new Set(granted))}
              className="rounded-lg border border-gray-300 px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-100 disabled:opacity-50"
            >
              Reset
            </button>
            <button
              type="button"
              disabled={!dirty || saving || readOnly}
              onClick={() => onSave([...selected])}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--cares-primary)] px-4 py-2 text-[13px] font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save changes
            </button>
          </div>
        </footer>
      </aside>
    </div>
  )
}
