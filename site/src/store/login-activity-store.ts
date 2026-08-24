import { create } from 'zustand'
import { listLoginActivity } from '../services/login-activity-service'
import type { LoginActivityEntry, LoginActivityFilters } from '../types/login-activity'

interface LoginActivityState {
  entries: LoginActivityEntry[]
  total: number
  /** Filters the loaded pages belong to — `loadMore` repeats them for the next page. */
  filters: LoginActivityFilters
  /** Undefined once the trail is exhausted; the scroll stops asking for more. */
  nextCursor?: string
  /** First page of a filter set — the grid shows skeleton rows. */
  loading: boolean
  /** A follow-up page — the grid keeps its rows and shows a footer spinner. */
  loadingMore: boolean
  /**
   * False until the first fetch settles. Without it, the mount render — where
   * `loading` is still false and `entries` is still empty — is indistinguishable from
   * a finished fetch that returned nothing, and the table flashes its empty state.
   */
  initialized: boolean
  error: string | null
  /** Loads page one and replaces whatever was on screen. */
  fetchActivity: (filters?: LoginActivityFilters) => Promise<void>
  /** Appends the next page. A no-op while a page is in flight or the trail has ended. */
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

    // A filter change that lands while an older fetch is still in flight would
    // otherwise overwrite the newer result set with stale rows.
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
