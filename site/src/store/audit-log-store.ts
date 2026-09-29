import { create } from 'zustand'
import { listAuditLogs } from '../services/audit-log-service'
import type { AuditLogEntry, AuditLogFilters } from '../types/audit-log'

interface AuditLogState {
  logs: AuditLogEntry[]
  total: number
  /** Filters the loaded pages belong to — `loadMore` repeats them for the next page. */
  filters: AuditLogFilters
  /** Undefined once the trail is exhausted; the scroll stops asking for more. */
  nextCursor?: string
  /** First page of a filter set — the grid shows skeleton rows. */
  loading: boolean
  /** A follow-up page — the grid keeps its rows and shows a footer spinner. */
  loadingMore: boolean
  /**
   * False until the first fetch settles. Without it, the mount render — where
   * `loading` is still false and `logs` is still empty — is indistinguishable from a
   * finished fetch that returned nothing, and the table flashes its empty state.
   */
  initialized: boolean
  error: string | null
  /** Loads page one and replaces whatever was on screen. */
  fetchLogs: (filters?: AuditLogFilters) => Promise<void>
  /** Appends the next page. A no-op while a page is in flight or the trail has ended. */
  loadMore: () => Promise<void>
}

export const useAuditLogStore = create<AuditLogState>((set, get) => ({
  logs: [],
  total: 0,
  filters: {},
  nextCursor: undefined,
  loading: false,
  loadingMore: false,
  initialized: false,
  error: null,

  fetchLogs: async (filters = {}) => {
    set({ loading: true, error: null, filters })
    const res = await listAuditLogs(filters)

    // A filter change that lands while an older fetch is still in flight would
    // otherwise overwrite the newer result set with stale rows.
    if (get().filters !== filters) return

    if (res.success) {
      set({
        logs: res.list,
        total: res.total,
        nextCursor: res.nextCursor,
        loading: false,
        initialized: true,
      })
    } else {
      set({
        error: res.message ?? 'Failed to load audit logs',
        loading: false,
        initialized: true,
      })
    }
  },

  loadMore: async () => {
    const { filters, nextCursor, loading, loadingMore } = get()
    if (!nextCursor || loading || loadingMore) return

    set({ loadingMore: true })
    const res = await listAuditLogs({ ...filters, cursor: nextCursor })

    if (get().filters !== filters) return

    if (res.success) {
      set((state) => ({
        logs: [...state.logs, ...res.list],
        total: res.total,
        nextCursor: res.nextCursor,
        loadingMore: false,
      }))
    } else {
      set({
        error: res.message ?? 'Failed to load more audit entries',
        loadingMore: false,
      })
    }
  },
}))
