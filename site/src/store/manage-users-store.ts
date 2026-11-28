import { create } from 'zustand'
import {
  blockManagedUserIp,
  deleteManagedUser,
  listManagedUsers,
  provisionManagedUser,
  reissueManagedUserCredentials,
  restrictManagedUser,
  unblockManagedUserIp,
  unrestrictManagedUser,
} from '../services/manage-user-service'
import type {
  CredentialDelivery,
  IssuedCredentials,
  ManagedUser,
  ManageUsersQuery,
  ProvisionUserPayload,
} from '../types/manage-users'

interface MutationOutcome {
  ok: boolean
  message?: string
}

interface CredentialOutcome extends MutationOutcome {
  credentials?: IssuedCredentials
  delivery?: CredentialDelivery | null
}

interface ManageUsersState {
  users: ManagedUser[]
  total: number
  truncated: boolean
  loading: boolean
  /** Distinguishes the mount render from an empty result, so the empty state doesn't flash. */
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
  deleteUser: (id: string) => Promise<MutationOutcome>
  provisionUser: (payload: ProvisionUserPayload) => Promise<CredentialOutcome>
  reissueCredentials: (
    id: string,
    expiresInHours: number,
  ) => Promise<CredentialOutcome>
}

export const useManageUsersStore = create<ManageUsersState>((set, get) => {
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

    deleteUser: async (id) => {
      const result = await deleteManagedUser(id)
      if (!result.success) {
        return { ok: false, message: result.message }
      }

      set({
        users: get().users.filter((user) => user.id !== id),
        total: Math.max(0, get().total - 1),
      })
      return { ok: true, message: result.message }
    },

    provisionUser: async (payload) => {
      const result = await provisionManagedUser(payload)
      if (!result.success) {
        return { ok: false, message: result.message }
      }

      // Matches server ordering; avoids a refetch mid-dialog.
      if (result.user) {
        const created = result.user
        set({ users: [created, ...get().users], total: get().total + 1 })
      }

      return {
        ok: true,
        message: result.message,
        credentials: result.credentials,
        delivery: result.delivery,
      }
    },

    reissueCredentials: async (id, expiresInHours) => {
      const result = await reissueManagedUserCredentials(id, expiresInHours)
      const outcome = applyMutation(result)

      return outcome.ok ? { ...outcome, credentials: result.credentials } : outcome
    },
  }
})
