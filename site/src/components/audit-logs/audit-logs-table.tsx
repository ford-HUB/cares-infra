import { useRef } from 'react'
import { Loader2 } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AUDIT_CELL_BASE,
  AUDIT_CELL_BORDER,
  AUDIT_COLUMNS,
  AUDIT_GUTTER_CELL,
  AUDIT_PAGE_SIZE,
  AUDIT_SEVERITY_ACCENT,
} from '../../constants/audit-logs'
import { formatRelativeTime, formatTimestamp } from '../../constants/formatting'
import { useInfiniteScroll } from '../../hooks/use-infinite-scroll'
import type { AuditLogEntry } from '../../types/audit-log'
import { UserAvatar } from '../portal/ui/user-avatar'
import { AuditCategoryBadge, AuditOutcomeBadge } from './ui/audit-log-badges'
import { AuditLogsTableSkeleton } from './ui/audit-logs-table-skeleton'

interface AuditLogsTableProps {
  logs: AuditLogEntry[]
  /** First page of a filter set — the grid is replaced by skeleton rows. */
  loading: boolean
  /** A follow-up page — the loaded rows stay put and the footer shows progress. */
  loadingMore: boolean
  /** False until the first fetch settles — see `audit-log-store`. */
  initialized: boolean
  errored: boolean
  hasMore: boolean
  total: number
  selectedId?: string
  onSelect: (entry: AuditLogEntry) => void
  onLoadMore: () => void
}

const cellBorder = AUDIT_CELL_BORDER
const cellBase = AUDIT_CELL_BASE
const gutter = AUDIT_GUTTER_CELL

/** `UserAvatar` takes two names; audit actors are stored as one denormalised string. */
function nameParts(name: string): { firstName: string; lastName: string } {
  const words = name.trim().split(/\s+/)
  return { firstName: words[0] ?? '', lastName: words.length > 1 ? words[words.length - 1] : '' }
}

export function AuditLogsTable({
  logs,
  loading,
  loadingMore,
  initialized,
  errored,
  hasMore,
  total,
  selectedId,
  onSelect,
  onLoadMore,
}: AuditLogsTableProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLTableRowElement>(null)

  // Covers the mount render too, where `loading` has not flipped true yet. A refilter
  // or refetch keeps existing rows on screen instead of blanking the grid.
  const showSkeleton = !initialized || (loading && logs.length === 0)

  useInfiniteScroll({
    sentinelRef,
    rootRef: scrollRef,
    enabled: hasMore && !showSkeleton && !loading && !loadingMore,
    onLoadMore,
  })

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
              {AUDIT_COLUMNS.map((column) => (
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
            {showSkeleton && <AuditLogsTableSkeleton rows={AUDIT_PAGE_SIZE} />}

            {!showSkeleton && logs.length === 0 && (
              <tr>
                <td
                  colSpan={AUDIT_COLUMNS.length + 1}
                  className="h-32 text-center text-sm text-gray-500"
                >
                  {errored
                    ? 'The audit trail could not be loaded.'
                    : 'No audit entries match the current filters.'}
                </td>
              </tr>
            )}

            {!showSkeleton &&
              logs.map((entry, index) => {
                const actor = nameParts(entry.actor.name)

                return (
                  <tr
                    key={entry.id}
                    tabIndex={0}
                    aria-selected={entry.id === selectedId}
                    onClick={() => onSelect(entry)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        onSelect(entry)
                      }
                    }}
                    className={`cursor-pointer outline-none odd:bg-gray-50/40 hover:bg-green-50/60 focus-visible:bg-green-50/60 ${
                      entry.id === selectedId ? 'bg-green-50/80' : ''
                    }`}
                  >
                    <td className={`${gutter} ${cellBase} relative px-0`}>
                      {/* Severity reads as a rail so a critical entry is findable while scrolling. */}
                      <span
                        aria-hidden
                        className={`absolute inset-y-0 left-0 w-1 ${AUDIT_SEVERITY_ACCENT[entry.severity]}`}
                      />
                      {index + 1}
                    </td>

                    <td
                      className={`${cellBorder} ${cellBase} text-gray-600`}
                      title={formatTimestamp(entry.createdAt)}
                    >
                      <span className="block truncate">
                        {formatRelativeTime(entry.createdAt)}
                      </span>
                    </td>

                    <td className={`${cellBorder} ${cellBase}`}>
                      <div className="flex items-center gap-2.5">
                        <UserAvatar
                          firstName={actor.firstName}
                          lastName={actor.lastName}
                        />
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-gray-900">
                            {entry.actor.name}
                          </span>
                          <span className="block truncate text-[11px] text-gray-500 capitalize">
                            {entry.actor.role}
                          </span>
                        </span>
                      </div>
                    </td>

                    <td className={`${cellBorder} ${cellBase}`} title={entry.description}>
                      <span className="block truncate text-gray-900">
                        {entry.description}
                      </span>
                      <span className="block truncate font-mono text-[11px] text-gray-400">
                        {entry.action}
                      </span>
                    </td>

                    <td className={`${cellBorder} ${cellBase}`}>
                      <AuditCategoryBadge category={entry.category} />
                    </td>

                    <td
                      className={`${cellBorder} ${cellBase} text-gray-600`}
                      title={`${entry.target.type} · ${entry.target.label}`}
                    >
                      {entry.target.label}
                    </td>

                    <td className={`${cellBorder} ${cellBase} font-mono text-gray-600`}>
                      {entry.ipAddress}
                    </td>

                    <td className={`${cellBorder} ${cellBase}`}>
                      <AuditOutcomeBadge outcome={entry.outcome} />
                    </td>
                  </tr>
                )
              })}

            {/*
              The sentinel is a real row so it sits inside the scroll container, below
              the last entry. Crossing it is what asks the store for the next page.
            */}
            {!showSkeleton && hasMore && (
              <tr ref={sentinelRef} aria-hidden>
                <td colSpan={AUDIT_COLUMNS.length + 1} className="h-px p-0" />
              </tr>
            )}

            {!showSkeleton && loadingMore && (
              <AuditLogsTableSkeleton rows={3} />
            )}
          </tbody>
        </table>

        {!showSkeleton && !hasMore && logs.length > 0 && (
          <p className="border-t border-gray-100 py-4 text-center text-[12px] text-gray-400">
            End of the audit trail — {logs.length} entries loaded.
          </p>
        )}
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-gray-200 bg-gray-50 px-4 py-2.5">
        {showSkeleton ? (
          <Skeleton className="h-3 w-40" />
        ) : (
          <p className="text-[12px] text-gray-500">
            {logs.length === 0
              ? 'No entries to show'
              : `Loaded ${logs.length} of ${total} entries`}
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
