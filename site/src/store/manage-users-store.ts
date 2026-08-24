import { create } from 'zustand'
import {
  blockManagedUserIp,
  listManagedUsers,
  provisionManagedUser,
  reissueManagedUserCredentials,
  restrictManagedUser,
  unblockManagedUserIp,
  unrestrictManagedUser,
} from '../services/manage-user-service'
import type {
  IssuedCredentials,
  ManagedUser,
  ManageUsersQuery,
  ProvisionUserPayload,
} from '../types/manage-users'

interface MutationOutcome {
  ok: boolean
  message?: string
}

/** Issuing a credential is a mutation that also hands back something to show once. */
interface CredentialOutcome extends MutationOutcome {
  credentials?: IssuedCredentials
}

interface ManageUsersState {
  users: ManagedUser[]
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
  fetchUsers: (query?: ManageUsersQuery) => Promise<void>
  restrictUser: (id: string, reason: string) => Promise<MutationOutcome>
  unrestrictUser: (id: string) => Promise<MutationOutcome>
  blockUserIp: (
    id: string,
    payload: { ipAddress?: string; reason?: string },
  ) => Promise<MutationOutcome>
  unblockUserIp: (id: string, ipAddress?: string) => Promise<MutationOutcome>
  provisionUser: (payload: ProvisionUserPayload) => Promise<CredentialOutcome>
  reissueCredentials: (
    id: string,
    expiresInHours: number,
  ) => Promise<CredentialOutcome>
}

export const useManageUsersStore = create<ManageUsersState>((set, get) => {
  /** Mutations return the updated row, so patch it in instead of refetching the list. */
  const applyMutation = (result: {
    success: boolean
    message?: string
    user?: ManagedUser
  }): MutationOutcome => {
    if (!result.success) {
      return { ok: false, message: result.message }
    }

    const updated = result.user
    if (updated) {
      set({
        users: get().users.map((user) => (user.id === updated.id ? updated : user)),
      })
    } else {
      void get().fetchUsers()
    }

    return { ok: true, message: result.message }
  }

  return {
    users: [],
    total: 0,
    truncated: false,
    loading: false,
    initialized: false,
    error: null,

    fetchUsers: async (query) => {
      set({ loading: true, error: null })
      const res = await listManagedUsers(query)

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
          error: res.message ?? 'Failed to load users',
          loading: false,
          initialized: true,
        })
      }
    },

    restrictUser: async (id, reason) =>
      applyMutation(await restrictManagedUser(id, reason)),

    unrestrictUser: async (id) => applyMutation(await unrestrictManagedUser(id)),

    blockUserIp: async (id, payload) =>
      applyMutation(await blockManagedUserIp(id, payload)),

    unblockUserIp: async (id, ipAddress) =>
      applyMutation(await unblockManagedUserIp(id, ipAddress)),

    provisionUser: async (payload) => {
      const result = await provisionManagedUser(payload)
      if (!result.success) {
        return { ok: false, message: result.message }
      }

      // A new row belongs at the top of the list the same way the server orders it,
      // and the total moves with it — patching beats a refetch mid-dialog.
      if (result.user) {
        const created = result.user
        set({ users: [created, ...get().users], total: get().total + 1 })
      }

      return { ok: true, message: result.message, credentials: result.credentials }
    },

    reissueCredentials: async (id, expiresInHours) => {
      const result = await reissueManagedUserCredentials(id, expiresInHours)
      const outcome = applyMutation(result)

      return outcome.ok ? { ...outcome, credentials: result.credentials } : outcome
    },
  }
})
