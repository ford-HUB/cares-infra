import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { ActiveSessionsTable } from '../../components/active-sessions/active-sessions-table'
import { ActiveSessionsToolbar } from '../../components/active-sessions/active-sessions-toolbar'
import {
  RevokeSessionModal,
  type RevokeTarget,
} from '../../components/active-sessions/ui/revoke-session-modal'
import { ContentShell } from '../../components/portal/ui/content-shell'
import {
  ACTIVE_SESSIONS_FILTER_ALL,
  ACTIVE_SESSIONS_SEARCH_DEBOUNCE_MS,
  type SessionRoleFilter,
  type SessionSourceFilter,
} from '../../constants/active-sessions'
import { LOGIN_PATH } from '../../constants/routes'
import { useActiveSessionsStore } from '../../store/active-sessions-store'
import { useAuthStore } from '../../store/auth-store'
import type { ActiveSession } from '../../types/active-session'

export function ActiveSessionsPage() {
  const sessions = useActiveSessionsStore((state) => state.sessions)
  const total = useActiveSessionsStore((state) => state.total)
  const activeNow = useActiveSessionsStore((state) => state.activeNow)
  const nextCursor = useActiveSessionsStore((state) => state.nextCursor)
  const loading = useActiveSessionsStore((state) => state.loading)
  const loadingMore = useActiveSessionsStore((state) => state.loadingMore)
  const initialized = useActiveSessionsStore((state) => state.initialized)
  const revoking = useActiveSessionsStore((state) => state.revoking)
  const error = useActiveSessionsStore((state) => state.error)
  const fetchSessions = useActiveSessionsStore((state) => state.fetchSessions)
  const loadMore = useActiveSessionsStore((state) => state.loadMore)
  const revoke = useActiveSessionsStore((state) => state.revoke)
  const revokeForUser = useActiveSessionsStore((state) => state.revokeForUser)

  const logout = useAuthStore((state) => state.logout)
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [source, setSource] = useState<SessionSourceFilter>(ACTIVE_SESSIONS_FILTER_ALL)
  const [role, setRole] = useState<SessionRoleFilter>(ACTIVE_SESSIONS_FILTER_ALL)
  const [target, setTarget] = useState<RevokeTarget | null>(null)

  /** Filters run server-side; the grid only holds scrolled pages. */
  useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedSearch(search.trim()),
      ACTIVE_SESSIONS_SEARCH_DEBOUNCE_MS,
    )
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    void fetchSessions({ search: debouncedSearch, source, role })
  }, [fetchSessions, debouncedSearch, source, role])

  // Stable so the scroll observer isn't rebuilt every render.
  const handleLoadMore = useCallback(() => void loadMore(), [loadMore])

  const refresh = () => void fetchSessions({ search: debouncedSearch, source, role })

  const sessionsPerUser = sessions.reduce<Record<string, number>>((counts, session) => {
    counts[session.userId] = (counts[session.userId] ?? 0) + 1
    return counts
  }, {})

  const openRevoke = (session: ActiveSession) => setTarget({ kind: 'session', session })

  const openRevokeUser = (session: ActiveSession) =>
    setTarget({
      kind: 'user',
      session,
      sessionCount: sessionsPerUser[session.userId] ?? 1,
    })

  /** Revoking this browser kills its token, so sign out instead of 401-ing. */
  const handleConfirm = async (confirmed: RevokeTarget) => {
    const endsThisBrowser =
      confirmed.kind === 'session'
        ? confirmed.session.isCurrent
        : sessions.some(
            (session) =>
              session.userId === confirmed.session.userId && session.isCurrent,
          )

    const result =
      confirmed.kind === 'session'
        ? await revoke(confirmed.session.id)
        : await revokeForUser(confirmed.session.userId)

    setTarget(null)

    if (!result.ok) {
      toast.error(result.message ?? 'The session could not be ended')
      return
    }

    if (endsThisBrowser) {
      await logout()
      navigate(LOGIN_PATH, { replace: true })
      return
    }

    toast.success(
      result.revoked === 1 ? 'Session ended' : `${result.revoked} sessions ended`,
    )
  }

  return (
    <ContentShell variant="full" className="flex h-full flex-col">
      <ActiveSessionsToolbar
        search={search}
        source={source}
        role={role}
        loaded={sessions.length}
        total={total}
        activeNow={activeNow}
        initialized={initialized}
        loading={loading}
        onSearchChange={setSearch}
        onSourceChange={setSource}
        onRoleChange={setRole}
        onRefresh={refresh}
      />

      {/* Distinguish a failed fetch from an empty filter result. */}
      {error && (
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-800">
          <span>{error}</span>
          <button
            type="button"
            onClick={refresh}
            className="font-medium underline underline-offset-2 hover:text-red-900"
          >
            Retry
          </button>
        </div>
      )}

      <ActiveSessionsTable
        sessions={sessions}
        loading={loading}
        loadingMore={loadingMore}
        initialized={initialized}
        errored={Boolean(error)}
        hasMore={Boolean(nextCursor)}
        total={total}
        revoking={revoking}
        onRevoke={openRevoke}
        onRevokeUser={openRevokeUser}
        onLoadMore={handleLoadMore}
      />

      <RevokeSessionModal
        target={target}
        loading={Boolean(revoking)}
        onClose={() => setTarget(null)}
        onConfirm={(confirmed) => void handleConfirm(confirmed)}
      />
    </ContentShell>
  )
}
