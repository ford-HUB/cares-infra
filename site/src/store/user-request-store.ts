import { create } from 'zustand'
import {
  acceptUserRequest,
  deleteUserRequest,
  fetchUserRequests,
  restoreUserRequest,
} from '../services/user-request-service'
import type { UserRequest } from '../types/user-request'

interface UserRequestState {
  requests: UserRequest[]
  loading: boolean
  /** False until the first fetch settles, so the empty state can't flash on mount. */
  initialized: boolean
  error: string | null
  fetchRequests: () => Promise<void>
  accept: (id: string) => Promise<void>
  remove: (id: string) => Promise<void>
  restore: (id: string) => Promise<void>
}

export const useUserRequestStore = create<UserRequestState>((set) => {
  const swap = (updated: UserRequest) =>
    set((state) => ({
      requests: state.requests.map((request) =>
        request.id === updated.id ? updated : request,
      ),
    }))

  return {
    requests: [],
    loading: false,
    initialized: false,
    error: null,

    fetchRequests: async () => {
      set({ loading: true, error: null })
      try {
        const requests = await fetchUserRequests()
        set({ requests, loading: false, initialized: true })
      } catch (error) {
        set({
          loading: false,
          initialized: true,
          error: error instanceof Error ? error.message : 'User requests could not be loaded',
        })
      }
    },

    accept: async (id) => swap(await acceptUserRequest(id)),
    remove: async (id) => swap(await deleteUserRequest(id)),
    restore: async (id) => swap(await restoreUserRequest(id)),
  }
})
