import { create } from 'zustand'
import {
  listActiveSessions,
  revokeSession,
  revokeUserSessions,
} from '../services/active-sessions-service'
import { SESSION_ACTIVE_NOW_MS } from '../constants/active-sessions'
import type { ActiveSession, ActiveSessionsFilters } from '../types/active-session'

/**
 * Devices used inside the touch window, counted when a page lands rather than during
 * render — a count read off the clock mid-render would differ between renders.
 */
function countActiveNow(sessions: ActiveSession[]): number {
  const since = Date.now() - SESSION_ACTIVE_NOW_MS
  return sessions.filter(
    (session) => new Date(session.lastSeenAt).getTime() >= since,
  ).length
}

interface RevokeOutcome {
  ok: boolean
  message?: string
  revoked: number
}

interface ActiveSessionsState {
  sessions: ActiveSession[]
  total: number
  /** Of the loaded devices, how many were used recently — see `countActiveNow`. */
  activeNow: number
  /** Filters the loaded pages belong to — `loadMore` repeats them for the next page. */
  filters: ActiveSessionsFilters
  /** Undefined once the list is exhausted; the scroll stops asking for more. */
  nextCursor?: string
  /** First page of a filter set — the grid shows skeleton rows. */
  loading: boolean
  /** A follow-up page — the grid keeps its rows and shows a footer spinner. */
  loadingMore: boolean
  /**
   * False until the first fetch settles. Without it, the mount render — where
   * `loading` is still false and `sessions` is still empty — is indistinguishable from
   * a finished fetch that returned nothing, and the table flashes its empty state.
   */
  initialized: boolean
  /** The session or account currently being revoked, so only its rows look pending. */
  revoking: string | null
  error: string | null
  /** Loads page one and replaces whatever was on screen. */
  fetchSessions: (filters?: ActiveSessionsFilters) => Promise<void>
  /** Appends the next page. A no-op while a page is in flight or the list has ended. */
  loadMore: () => Promise<void>
  revoke: (sessionId: string) => Promise<RevokeOutcome>
  revokeForUser: (userId: string, keepCurrent?: boolean) => Promise<RevokeOutcome>
}

export const useActiveSessionsStore = create<ActiveSessionsState>((set, get) => {
  /**
   * Drops the rows the server just ended, so the grid settles immediately instead of
   * waiting out a refetch — which, mid-scroll, would also throw away the loaded pages.
   */
  const dropSessions = (gone: (session: ActiveSession) => boolean) => {
    const remaining = get().sessions.filter((session) => !gone(session))
    const removed = get().sessions.length - remaining.length

    set({
      sessions: remaining,
      total: Math.max(0, get().total - removed),
      activeNow: countActiveNow(remaining),
    })
  }

  return {
    sessions: [],
    total: 0,
    activeNow: 0,
    filters: {},
    nextCursor: undefined,
    loading: false,
    loadingMore: false,
    initialized: false,
    revoking: null,
    error: null,

    fetchSessions: async (filters = {}) => {
      set({ loading: true, error: null, filters })
      const res = await listActiveSessions(filters)

      // A filter change that lands while an older fetch is still in flight would
      // otherwise overwrite the newer result set with stale rows.
      if (get().filters !== filters) return

      if (res.success) {
        set({
          sessions: res.list,
          total: res.total,
          activeNow: countActiveNow(res.list),
          nextCursor: res.nextCursor,
          loading: false,
          initialized: true,
        })
      } else {
        set({
          error: res.message ?? 'Failed to load active sessions',
          loading: false,
          initialized: true,
        })
      }
    },

    loadMore: async () => {
      const { filters, nextCursor, loading, loadingMore } = get()
      if (!nextCursor || loading || loadingMore) return

      set({ loadingMore: true })
      const res = await listActiveSessions({ ...filters, cursor: nextCursor })

      if (get().filters !== filters) return

      if (res.success) {
        set((state) => {
          const sessions = [...state.sessions, ...res.list]
          return {
            sessions,
            total: res.total,
            activeNow: countActiveNow(sessions),
            nextCursor: res.nextCursor,
            loadingMore: false,
          }
        })
      } else {
        set({
          error: res.message ?? 'Failed to load more sessions',
          loadingMore: false,
        })
      }
    },

    revoke: async (sessionId) => {
      set({ revoking: sessionId })
      const res = await revokeSession(sessionId)
      set({ revoking: null })

      if (res.success) {
        dropSessions((session) => session.id === sessionId)
      }

      return { ok: res.success, message: res.message, revoked: res.revoked }
    },

    revokeForUser: async (userId, keepCurrent = false) => {
      set({ revoking: userId })
      const res = await revokeUserSessions(userId, keepCurrent)
      set({ revoking: null })

      if (res.success) {
        dropSessions(
          (session) =>
            session.userId === userId && !(keepCurrent && session.isCurrent),
        )
      }

      return { ok: res.success, message: res.message, revoked: res.revoked }
    },
  }
})
