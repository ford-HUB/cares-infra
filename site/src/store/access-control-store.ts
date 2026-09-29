import { create } from 'zustand'
import {
  getAccessCatalog,
  getAccessUserDetail,
  liftAccessUserSuspension,
  listAccessUsers,
  suspendAccessUserActions,
  updateAccessUserPermissions,
  updateRoleBaseline,
} from '../services/access-control-service'
import type {
  AccessCatalog,
  AccessUser,
  AccessUserDetail,
  AccessUsersQuery,
  PermissionKey,
} from '../types/access-control'

interface MutationOutcome {
  ok: boolean
  message?: string
}

interface AccessControlState {
  users: AccessUser[]
  total: number
  truncated: boolean
  loading: boolean
  /**
   * False until the first fetch settles. Without it, the mount render — where
   * `loading` is still false and `users` is still empty — is indistinguishable from a
   * finished fetch that returned nothing, and the table flashes its empty state.
   */
  initialized: boolean
  error: string | null

  /**
   * The permission catalog is the same for every admin and changes only when the
   * server ships a new key, so it is fetched once per session and held here rather
   * than being re-requested on each visit.
   */
  catalog: AccessCatalog | null
  catalogLoading: boolean

  /**
   * The query behind the rows on screen. A baseline change has to refetch, and it must
   * reuse the active filter — refetching bare would quietly widen the table while the
   * toolbar still reads "Customised".
   */
  lastQuery: AccessUsersQuery

  /** The row whose rights panel is open, kept separate from the list rows. */
  detail: AccessUserDetail | null
  detailLoading: boolean
  detailError: string | null

  fetchCatalog: () => Promise<void>
  fetchUsers: (query?: AccessUsersQuery) => Promise<void>
  openDetail: (id: string) => Promise<void>
  clearDetail: () => void
  saveUserPermissions: (
    id: string,
    permissions: PermissionKey[],
    reason?: string,
  ) => Promise<MutationOutcome>
  suspendActions: (
    id: string,
    payload: { permissions: PermissionKey[]; reason: string; expiresAt?: string },
  ) => Promise<MutationOutcome>
  liftSuspension: (id: string, suspensionId: string) => Promise<MutationOutcome>
  saveRoleBaseline: (
    role: string,
    permissions: PermissionKey[],
  ) => Promise<MutationOutcome>
}

export const useAccessControlStore = create<AccessControlState>((set, get) => {
  /**
   * Every mutation returns the user's full rights detail, so patch both the open panel
   * and the matching list row instead of refetching the whole table.
   */
  const applyDetail = (result: {
    success: boolean
    message?: string
    detail?: AccessUserDetail
  }): MutationOutcome => {
    if (!result.success || !result.detail) {
      return { ok: false, message: result.message }
    }

    const updated = result.detail
    set({
      detail: updated,
      users: get().users.map((user) =>
        user.id === updated.id ? { ...user, ...toListRow(updated) } : user,
      ),
    })

    return { ok: true, message: result.message }
  }

  return {
    users: [],
    total: 0,
    truncated: false,
    loading: false,
    initialized: false,
    error: null,

    catalog: null,
    catalogLoading: false,
    lastQuery: {},

    detail: null,
    detailLoading: false,
    detailError: null,

    fetchCatalog: async () => {
      if (get().catalog || get().catalogLoading) return

      set({ catalogLoading: true })
      const res = await getAccessCatalog()
      set({
        catalog: res.success ? (res.catalog ?? null) : null,
        catalogLoading: false,
        ...(res.success ? {} : { error: res.message ?? 'Failed to load the catalog' }),
      })
    },

    fetchUsers: async (query) => {
      const effectiveQuery = query ?? get().lastQuery
      set({ loading: true, error: null, lastQuery: effectiveQuery })
      const res = await listAccessUsers(effectiveQuery)

      if (res.success) {
        set({
          users: res.list,
          total: res.total,
          truncated: res.truncated,
          loading: false,
          initialized: true,
        })
      } else {
        set({
          error: res.message ?? 'Failed to load access rights',
          loading: false,
          initialized: true,
        })
      }
    },

    openDetail: async (id) => {
      // Already loaded for this row — reuse it instead of refetching.
      if (get().detail?.id === id) return

      set({ detailLoading: true, detailError: null, detail: null })
      const res = await getAccessUserDetail(id)

      set({
        detail: res.success ? (res.detail ?? null) : null,
        detailLoading: false,
        detailError: res.success
          ? null
          : (res.message ?? 'Rights could not be loaded'),
      })
    },

    clearDetail: () => set({ detail: null, detailError: null }),

    saveUserPermissions: async (id, permissions, reason) =>
      applyDetail(await updateAccessUserPermissions(id, permissions, reason)),

    suspendActions: async (id, payload) =>
      applyDetail(await suspendAccessUserActions(id, payload)),

    liftSuspension: async (id, suspensionId) =>
      applyDetail(await liftAccessUserSuspension(id, suspensionId)),

    saveRoleBaseline: async (role, permissions) => {
      const res = await updateRoleBaseline(role, permissions)
      if (!res.success || !res.role || !res.permissions) {
        return { ok: false, message: res.message }
      }

      const catalog = get().catalog
      const nextRole = res.role
      const nextPermissions = res.permissions

      set({
        catalog: catalog
          ? {
              ...catalog,
              roles: catalog.roles.map((entry) =>
                entry.role === nextRole
                  ? { ...entry, permissions: nextPermissions }
                  : entry,
              ),
            }
          : catalog,
      })

      // A baseline change moves the effective rights of everyone holding that role.
      await get().fetchUsers()
      return { ok: true, message: res.message }
    },
  }
})

/** The list row's slice of a detail payload — keeps the table in sync after a mutation. */
function toListRow(detail: AccessUserDetail): AccessUser {
  return {
    id: detail.id,
    email: detail.email,
    firstName: detail.firstName,
    lastName: detail.lastName,
    role: detail.role,
    department: detail.department,
    isRestricted: detail.isRestricted,
    isProtected: detail.isProtected,
    effectivePermissions: detail.effectivePermissions,
    grantedCount: detail.grantedCount,
    revokedCount: detail.revokedCount,
    suspendedCount: detail.suspendedCount,
    latestSuspensionReason: detail.latestSuspensionReason,
  }
}
