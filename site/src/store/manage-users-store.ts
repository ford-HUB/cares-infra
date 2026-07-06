import { create } from 'zustand'
import type { ManagedUser } from '../types/manage-users'
import {
  deactivateManagedUser,
  listManagedUsers,
  restoreManagedUser,
} from '../services/manage-user-service'

interface ManageUsersState {
  users: ManagedUser[]
  loading: boolean
  error: string | null
  fetchUsers: () => Promise<void>
  deactivateUser: (id: string, reason: string) => Promise<boolean>
  restoreUser: (id: string) => Promise<boolean>
}

export const useManageUsersStore = create<ManageUsersState>((set, get) => ({
  users: [],
  loading: false,
  error: null,

  fetchUsers: async () => {
    set({ loading: true, error: null })
    const res = await listManagedUsers()
    if (res.success) {
      set({ users: res.list, loading: false })
    } else {
      set({ error: res.message ?? 'Failed to load users', loading: false })
    }
  },

  deactivateUser: async (id, reason) => {
    const res = await deactivateManagedUser(id, reason)
    if (res.success) {
      await get().fetchUsers()
      return true
    }
    return false
  },

  restoreUser: async (id) => {
    const res = await restoreManagedUser(id)
    if (res.success) {
      await get().fetchUsers()
      return true
    }
    return false
  },
}))
