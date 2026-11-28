import { create } from 'zustand'
import { listAuditLogs } from '../services/audit-log-service'
import type { AuditLogEntry, AuditLogFilters } from '../types/audit-log'

interface AuditLogState {
  logs: AuditLogEntry[]
  total: number
  filters: AuditLogFilters
  nextCursor?: string
  loading: boolean
  loadingMore: boolean
  /** Distinguishes the mount render from an empty result, so the empty state doesn't flash. */
  initialized: boolean
  error: string | null
  fetchLogs: (filters?: AuditLogFilters) => Promise<void>
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

    // Drop stale results from an older filter set.
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
