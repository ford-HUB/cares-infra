import { useRef } from 'react'
import { Loader2, LogOut, Users } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ACTIVE_SESSIONS_COLUMNS,
  ACTIVE_SESSIONS_PAGE_SIZE,
  SESSION_ACTIVE_NOW_MS,
  SESSION_CELL_BASE,
  SESSION_CELL_BORDER,
  SESSION_GUTTER_CELL,
  SESSION_ROLE_LABELS,
} from '../../constants/active-sessions'
import { formatRelativeTime, formatTimestamp } from '../../constants/formatting'
import { useInfiniteScroll } from '../../hooks/use-infinite-scroll'
import type { ActiveSession } from '../../types/active-session'
import { formatUserAgent } from '../../utils/user-agent-label'
import { ActiveSessionsTableSkeleton } from './ui/active-sessions-table-skeleton'
import { SessionSourceBadge } from './ui/session-source-badge'

interface ActiveSessionsTableProps {
  sessions: ActiveSession[]
  /** First page of a filter set — the grid is replaced by skeleton rows. */
  loading: boolean
  /** A follow-up page — the loaded rows stay put and the footer shows progress. */
  loadingMore: boolean
  /** False until the first fetch settles — see `active-sessions-store`. */
  initialized: boolean
  errored: boolean
  hasMore: boolean
  total: number
  /** Session or account id currently being revoked, so its rows show as pending. */
  revoking: string | null
  onRevoke: (session: ActiveSession) => void
  onRevokeUser: (session: ActiveSession) => void
  onLoadMore: () => void
}

const cellBorder = SESSION_CELL_BORDER
const cellBase = SESSION_CELL_BASE
const gutter = SESSION_GUTTER_CELL

function isActiveNow(session: ActiveSession): boolean {
  return Date.now() - new Date(session.lastSeenAt).getTime() < SESSION_ACTIVE_NOW_MS
}

export function ActiveSessionsTable({
  sessions,
  loading,
  loadingMore,
  initialized,
  errored,
  hasMore,
  total,
  revoking,
  onRevoke,
  onRevokeUser,
  onLoadMore,
}: ActiveSessionsTableProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLTableRowElement>(null)

  // Covers the mount render too, where `loading` has not flipped true yet. A refilter
  // or refetch keeps existing rows on screen instead of blanking the grid.
  const showSkeleton = !initialized || (loading && sessions.length === 0)

  useInfiniteScroll({
    sentinelRef,
    rootRef: scrollRef,
    enabled: hasMore && !showSkeleton && !loading && !loadingMore,
    onLoadMore,
  })

  // How many loaded devices each account has, so a row offers "end all" only when it
  // would end more than the row itself.
  const perUser = sessions.reduce<Record<string, number>>((counts, session) => {
    counts[session.userId] = (counts[session.userId] ?? 0) + 1
    return counts
  }, {})

  return (
    <div
      aria-busy={showSkeleton}
      className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
    >
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-x-auto overflow-y-auto">
        <table className="w-full min-w-[60rem] table-fixed border-separate border-spacing-0">
          <thead className="sticky top-0 z-20">
            <tr>
              <th
                scope="col"
                className={`${gutter} z-30 h-9 border-b border-gray-200 px-0 font-semibold`}
              >
                #
              </th>
              {ACTIVE_SESSIONS_COLUMNS.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={`${cellBorder} ${column.width} h-9 border-b border-gray-200 bg-gray-50 px-3 text-left text-[11px] font-semibold tracking-wider text-gray-500 uppercase`}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {showSkeleton && (
              <ActiveSessionsTableSkeleton rows={ACTIVE_SESSIONS_PAGE_SIZE} />
            )}

            {!showSkeleton && sessions.length === 0 && (
              <tr>
                <td
                  colSpan={ACTIVE_SESSIONS_COLUMNS.length + 1}
                  className="h-32 text-center text-sm text-gray-500"
                >
                  {errored
                    ? 'Active sessions could not be loaded.'
                    : 'No signed-in devices match the current filters.'}
                </td>
              </tr>
            )}

            {!showSkeleton &&
              sessions.map((session, index) => {
                const name = [session.firstName, session.lastName]
                  .filter(Boolean)
                  .join(' ')
                const pending = revoking === session.id || revoking === session.userId
                const deviceCount = perUser[session.userId] ?? 1

                return (
                  <tr
                    key={session.id}
                    className={`odd:bg-gray-50/40 hover:bg-green-50/60 ${
                      pending ? 'opacity-50' : ''
                    }`}
                  >
                    <td className={`${gutter} ${cellBase} px-0`}>{index + 1}</td>

                    <td className={`${cellBorder} ${cellBase}`}>
                      <div className="flex flex-col justify-center leading-tight">
                        <span className="flex items-center gap-1.5 truncate font-medium text-gray-900">
                          {name || 'Unknown account'}
                          {session.isCurrent && (
                            <span className="rounded-full bg-green-100 px-1.5 py-px text-[10px] font-medium text-green-700">
                              This device
                            </span>
                          )}
                          {session.isRestricted && (
                            <span className="rounded-full bg-red-100 px-1.5 py-px text-[10px] font-medium text-red-700">
                              Restricted
                            </span>
                          )}
                        </span>
                        <span className="truncate text-[11px] text-gray-500">
                          {session.email}
                        </span>
                      </div>
                    </td>

                    <td className={`${cellBorder} ${cellBase} text-gray-600`}>
                      {SESSION_ROLE_LABELS[session.role] ?? session.role}
                    </td>

                    <td className={`${cellBorder} ${cellBase}`} title={session.userAgent}>
                      <div className="flex items-center gap-1.5">
                        <SessionSourceBadge source={session.source} />
                        <span className="truncate text-[11px] text-gray-500">
                          {formatUserAgent(session.userAgent)}
                        </span>
                      </div>
                    </td>

                    <td className={`${cellBorder} ${cellBase} font-mono text-gray-600`}>
                      {session.ipAddress}
                    </td>

                    <td
                      className={`${cellBorder} ${cellBase} text-gray-600`}
                      title={formatTimestamp(session.signedInAt)}
                    >
                      <span className="block truncate">
                        {formatRelativeTime(session.signedInAt)}
                      </span>
                    </td>

                    <td
                      className={`${cellBorder} ${cellBase} text-gray-600`}
                      title={formatTimestamp(session.lastSeenAt)}
                    >
                      <span className="flex items-center gap-1.5">
                        <span
                          className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                            isActiveNow(session) ? 'bg-green-500' : 'bg-gray-300'
                          }`}
                        />
                        <span className="truncate">
                          {formatRelativeTime(session.lastSeenAt)}
                        </span>
                      </span>
                    </td>

                    <td
                      className={`${cellBorder} ${cellBase} text-gray-600`}
                      title={formatTimestamp(session.expiresAt)}
                    >
                      <span className="block truncate">
                        {formatRelativeTime(session.expiresAt)}
                      </span>
                    </td>

                    <td className={`${cellBorder} ${cellBase}`}>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onRevoke(session)}
                          disabled={pending}
                          title="End this session"
                          aria-label={`End the session on ${formatUserAgent(session.userAgent)} for ${session.email}`}
                          className="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                        >
                          <LogOut className="h-3.5 w-3.5" />
                        </button>

                        {deviceCount > 1 && (
                          <button
                            type="button"
                            onClick={() => onRevokeUser(session)}
                            disabled={pending}
                            title={`End all ${deviceCount} sessions for this account`}
                            aria-label={`End all ${deviceCount} sessions for ${session.email}`}
                            className="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                          >
                            <Users className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}

            {/*
              The sentinel is a real row so it sits inside the scroll container, below
              the last session. Crossing it is what asks the store for the next page.
            */}
            {!showSkeleton && hasMore && (
              <tr ref={sentinelRef} aria-hidden>
                <td colSpan={ACTIVE_SESSIONS_COLUMNS.length + 1} className="h-px p-0" />
              </tr>
            )}

            {!showSkeleton && loadingMore && <ActiveSessionsTableSkeleton rows={3} />}
          </tbody>
        </table>

        {!showSkeleton && !hasMore && sessions.length > 0 && (
          <p className="border-t border-gray-100 py-4 text-center text-[12px] text-gray-400">
            End of the list — {sessions.length} signed-in devices loaded.
          </p>
        )}
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-gray-200 bg-gray-50 px-4 py-2.5">
        {showSkeleton ? (
          <Skeleton className="h-3 w-40" />
        ) : (
          <p className="text-[12px] text-gray-500">
            {sessions.length === 0
              ? 'No sessions to show'
              : `Loaded ${sessions.length} of ${total} devices`}
          </p>
        )}

        {loadingMore && (
          <span className="flex items-center gap-2 text-[12px] text-gray-500">
            <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" />
            Loading more…
          </span>
        )}

        {!showSkeleton && !loadingMore && hasMore && (
          // Keyboard and screen-reader users never trigger the observer; this does.
          <button
            type="button"
            onClick={onLoadMore}
            className="rounded-md border border-gray-200 bg-white px-3 py-1 text-[12px] text-gray-700 hover:bg-gray-50"
          >
            Load more
          </button>
        )}
      </div>
    </div>
  )
}
