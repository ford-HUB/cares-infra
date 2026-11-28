import { create } from 'zustand'
import { listLoginActivity } from '../services/login-activity-service'
import type { LoginActivityEntry, LoginActivityFilters } from '../types/login-activity'

interface LoginActivityState {
  entries: LoginActivityEntry[]
  total: number
  filters: LoginActivityFilters
  nextCursor?: string
  loading: boolean
  loadingMore: boolean
  /** Distinguishes the mount render from an empty result, so the empty state doesn't flash. */
  initialized: boolean
  error: string | null
  fetchActivity: (filters?: LoginActivityFilters) => Promise<void>
  loadMore: () => Promise<void>
}

export const useLoginActivityStore = create<LoginActivityState>((set, get) => ({
  entries: [],
  total: 0,
  filters: {},
  nextCursor: undefined,
  loading: false,
  loadingMore: false,
  initialized: false,
  error: null,

  fetchActivity: async (filters = {}) => {
    set({ loading: true, error: null, filters })
    const res = await listLoginActivity(filters)

    // Drop stale results from an older filter set.
    if (get().filters !== filters) return

    if (res.success) {
      set({
        entries: res.list,
        total: res.total,
        nextCursor: res.nextCursor,
        loading: false,
        initialized: true,
      })
    } else {
      set({
        error: res.message ?? 'Failed to load login activity',
        loading: false,
        initialized: true,
      })
    }
  },

  loadMore: async () => {
    const { filters, nextCursor, loading, loadingMore } = get()
    if (!nextCursor || loading || loadingMore) return

    set({ loadingMore: true })
    const res = await listLoginActivity({ ...filters, cursor: nextCursor })

    if (get().filters !== filters) return

    if (res.success) {
      set((state) => ({
        entries: [...state.entries, ...res.list],
        total: res.total,
        nextCursor: res.nextCursor,
        loadingMore: false,
      }))
    } else {
      set({
        error: res.message ?? 'Failed to load more sign-in attempts',
        loadingMore: false,
      })
    }
  },
}))
