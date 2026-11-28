import { create } from 'zustand'
import {
  listActiveSessions,
  revokeSession,
  revokeUserSessions,
} from '../services/active-sessions-service'
import { SESSION_ACTIVE_NOW_MS } from '../constants/active-sessions'
import type { ActiveSession, ActiveSessionsFilters } from '../types/active-session'

/** Counted when a page lands, not during render, so renders agree. */
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
  activeNow: number
  filters: ActiveSessionsFilters
  nextCursor?: string
  loading: boolean
  loadingMore: boolean
  /** Distinguishes the mount render from an empty result, so the empty state doesn't flash. */
  initialized: boolean
  revoking: string | null
  error: string | null
  fetchSessions: (filters?: ActiveSessionsFilters) => Promise<void>
  loadMore: () => Promise<void>
  revoke: (sessionId: string) => Promise<RevokeOutcome>
  revokeForUser: (userId: string, keepCurrent?: boolean) => Promise<RevokeOutcome>
}

export const useActiveSessionsStore = create<ActiveSessionsState>((set, get) => {
  /** Drop locally: a mid-scroll refetch would discard loaded pages. */
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

      // Drop stale results from an older filter set.
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
