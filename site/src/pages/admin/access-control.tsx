import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { AccessControlTable } from '../../components/access-control/access-control-table'
import { AccessControlToolbar } from '../../components/access-control/access-control-toolbar'
import { AccessRightsPanel } from '../../components/access-control/ui/access-rights-panel'
import { RoleBaselinesModal } from '../../components/access-control/ui/role-baselines-modal'
import { SuspendActionsModal } from '../../components/access-control/ui/suspend-actions-modal'
import { ContentShell } from '../../components/portal/ui/content-shell'
import {
  ACCESS_RIGHTS_FILTER_ALL,
  ACCESS_ROLE_FILTER_ALL,
} from '../../constants/access-control'
import { useAccessControlStore } from '../../store/access-control-store'
import type {
  AccessRightsFilter,
  AccessUser,
  PermissionKey,
} from '../../types/access-control'

export function AccessControlPage() {
  const {
    users,
    loading,
    initialized,
    truncated,
    total,
    error,
    catalog,
    detail,
    detailLoading,
    detailError,
    fetchCatalog,
    fetchUsers,
    openDetail,
    clearDetail,
    saveUserPermissions,
    liftSuspension,
    saveRoleBaseline,
  } = useAccessControlStore()

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>(ACCESS_ROLE_FILTER_ALL)
  const [rightsFilter, setRightsFilter] = useState<AccessRightsFilter>(
    ACCESS_RIGHTS_FILTER_ALL,
  )
  const [page, setPage] = useState(1)

  const [managedUser, setManagedUser] = useState<AccessUser | null>(null)
  const [suspendOpen, setSuspendOpen] = useState(false)
  const [baselinesOpen, setBaselinesOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void fetchCatalog()
  }, [fetchCatalog])

  /**
   * The rights filter narrows on the server — it needs the whole result set, not just
   * the loaded page. This also covers the initial load, so there is no second fetch.
   */
  useEffect(() => {
    void fetchUsers({ rights: rightsFilter })
  }, [fetchUsers, rightsFilter])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return users.filter((user) => {
      const matchesSearch =
        !term ||
        user.email.toLowerCase().includes(term) ||
        `${user.firstName} ${user.lastName}`.toLowerCase().includes(term)
      const matchesRole =
        roleFilter === ACCESS_ROLE_FILTER_ALL || user.role === roleFilter
      return matchesSearch && matchesRole
    })
  }, [search, roleFilter, users])

  const roles = useMemo(() => [...new Set(users.map((user) => user.role))], [users])
  const customisedCount = users.filter(
    (user) => user.grantedCount > 0 || user.revokedCount > 0,
  ).length
  const suspendedCount = users.filter((user) => user.suspendedCount > 0).length

  const resetToFirstPage =
    <T,>(apply: (value: T) => void) =>
    (value: T) => {
      apply(value)
      setPage(1)
    }

  const runMutation = useCallback(
    async (action: () => Promise<{ ok: boolean; message?: string }>, fallback: string) => {
      setSaving(true)
      const result = await action()
      setSaving(false)

      if (result.ok) {
        toast.success(result.message ?? fallback)
      } else {
        toast.error(result.message ?? 'The request could not be completed')
      }
      return result.ok
    },
    [],
  )

  const handleManage = (user: AccessUser) => {
    setManagedUser(user)
    void openDetail(user.id)
  }

  const closePanel = () => {
    setManagedUser(null)
    setSuspendOpen(false)
    clearDetail()
  }

  const handleSave = (permissions: PermissionKey[]) => {
    if (!managedUser) return
    void runMutation(
      () => saveUserPermissions(managedUser.id, permissions),
      `Rights updated for ${managedUser.firstName} ${managedUser.lastName}`,
    )
  }

  const handleLift = (suspensionId: string) => {
    if (!managedUser) return
    void runMutation(
      () => liftSuspension(managedUser.id, suspensionId),
      'Suspension lifted',
    )
  }

  const handleSaveBaseline = (role: string, permissions: PermissionKey[]) => {
    void runMutation(
      () => saveRoleBaseline(role, permissions),
      `${role} baseline updated`,
    ).then((ok) => {
      if (ok) setBaselinesOpen(false)
    })
  }

  return (
    <ContentShell variant="full" className="flex h-full flex-col">
      <AccessControlToolbar
        search={search}
        role={roleFilter}
        rights={rightsFilter}
        roles={roles}
        shown={filtered.length}
        total={users.length}
        customised={customisedCount}
        suspended={suspendedCount}
        initialized={initialized}
        onSearchChange={resetToFirstPage(setSearch)}
        onRoleChange={resetToFirstPage(setRoleFilter)}
        onRightsChange={resetToFirstPage(setRightsFilter)}
        onEditBaselines={() => setBaselinesOpen(true)}
      />

      {/*
        A failed fetch leaves `users` empty, which the table would otherwise render as
        "no accounts match the current filters" — a filter problem, not the outage it
        actually is. Say which one it is.
      */}
      {error && (
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-800">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void fetchUsers({ rights: rightsFilter })}
            className="font-medium underline underline-offset-2 hover:text-red-900"
          >
            Retry
          </button>
        </div>
      )}

      {truncated && (
        <p className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-[13px] text-amber-800">
          Showing the first {users.length} of {total} accounts. Narrow the search to
          reach the rest.
        </p>
      )}

      <AccessControlTable
        users={filtered}
        loading={loading}
        initialized={initialized}
        errored={Boolean(error)}
        totalPermissions={catalog?.permissions.length ?? 0}
        page={page}
        onPageChange={setPage}
        onManage={handleManage}
      />

      <AccessRightsPanel
        user={managedUser}
        detail={detail}
        catalog={catalog}
        loading={detailLoading}
        error={detailError ?? undefined}
        saving={saving}
        onClose={closePanel}
        onSave={handleSave}
        onSuspend={() => setSuspendOpen(true)}
        onLiftSuspension={handleLift}
      />

      {suspendOpen && (
        <SuspendActionsModal
          user={managedUser}
          detail={detail}
          permissions={catalog?.permissions ?? []}
          onClose={() => setSuspendOpen(false)}
        />
      )}

      <RoleBaselinesModal
        open={baselinesOpen}
        catalog={catalog}
        saving={saving}
        onClose={() => setBaselinesOpen(false)}
        onSave={handleSaveBaseline}
      />
    </ContentShell>
  )
}
