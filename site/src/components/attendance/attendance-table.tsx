import { useEffect, useRef } from 'react'
import dayjs from 'dayjs'
import { Skeleton } from '@/components/ui/skeleton'
import {
  LIVE_ATTENDANCE_COLUMNS,
  LIVE_CELL_BASE,
  LIVE_CELL_BORDER,
  LIVE_GUTTER_CELL,
  LIVE_HEADER_HEIGHT_PX,
  LIVE_ROW_HEIGHT_PX,
  LIVE_STALE_PING_MS,
} from '../../constants/attendance'
import {
  formatDistanceMeters,
  formatRelativeTime,
  formatTimeOfDay,
} from '../../constants/formatting'
import { useRowsPerPage } from '../../hooks/use-rows-per-page'
import type { LiveAttendee } from '../../types/attendance'
import { TablePagination } from '../portal/ui/table-pagination'
import { UserAvatar } from '../portal/ui/user-avatar'
import { AttendanceTableSkeleton } from './ui/attendance-table-skeleton'
import { LiveCoverageBar } from './ui/live-coverage-bar'
import { LiveStateBadge } from './ui/live-state-badge'

interface AttendanceTableProps {
  attendees: LiveAttendee[]
  /** First load only — see `attendance-store`. */
  loading: boolean
  /** A poll over rows already on screen; shows a sweep, never a skeleton. */
  refreshing: boolean
  initialized: boolean
  /** Snapshot capture time; every "how long ago" on a row is measured against it. */
  capturedAt: string | null
  page: number
  onPageChange: (page: number) => void
  onView: (attendee: LiveAttendee) => void
}

const cellBorder = LIVE_CELL_BORDER
const cellBase = LIVE_CELL_BASE
const gutter = LIVE_GUTTER_CELL

/** A device that has not reported in a while is still "in area", but worth flagging. */
function isPingStale(lastPingAt: string | null | undefined, capturedAt: string | null) {
  if (!lastPingAt) return false
  return dayjs(capturedAt ?? undefined).diff(dayjs(lastPingAt)) > LIVE_STALE_PING_MS
}

export function AttendanceTable({
  attendees,
  loading,
  refreshing,
  initialized,
  capturedAt,
  page,
  onPageChange,
  onView,
}: AttendanceTableProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const { rowsPerPage, remainder } = useRowsPerPage(
    scrollRef,
    LIVE_ROW_HEIGHT_PX,
    LIVE_HEADER_HEIGHT_PX,
  )

  // Covers the mount render too, where `loading` has not flipped true yet. A poll or a
  // refilter keeps existing rows on screen instead of blanking the grid.
  const showSkeleton = !initialized || (loading && attendees.length === 0)

  const totalPages = Math.max(1, Math.ceil(attendees.length / rowsPerPage))
  const currentPage = Math.min(page, totalPages)
  const start = (currentPage - 1) * rowsPerPage
  const rows = attendees.slice(start, start + rowsPerPage)
  const fillers = Array.from({ length: Math.max(0, rowsPerPage - rows.length) })

  useEffect(() => {
    if (page > totalPages) onPageChange(totalPages)
  }, [page, totalPages, onPageChange])

  return (
    <div
      aria-busy={showSkeleton || refreshing}
      className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
    >
      {refreshing && !showSkeleton && (
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 z-30 h-0.5 w-1/4 animate-live-sweep bg-[var(--cares-primary)]"
        />
      )}

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
              {LIVE_ATTENDANCE_COLUMNS.map((column) => (
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
            {showSkeleton && <AttendanceTableSkeleton rows={rowsPerPage} />}

            {!showSkeleton && attendees.length === 0 && (
              <tr>
                <td
                  colSpan={LIVE_ATTENDANCE_COLUMNS.length + 1}
                  className="h-32 text-center text-sm text-gray-500"
                >
                  No volunteers match the current filters.
                </td>
              </tr>
            )}

            {!showSkeleton &&
              rows.map((attendee, index) => {
                const stale = isPingStale(attendee.lastPingAt, capturedAt)

                return (
                  <tr
                    key={attendee.id}
                    tabIndex={0}
                    onClick={() => onView(attendee)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        onView(attendee)
                      }
                    }}
                    className="cursor-pointer outline-none odd:bg-gray-50/40 hover:bg-green-50/60 focus-visible:bg-green-50/60"
                  >
                    <td className={`${gutter} ${cellBase} px-0`}>{start + index + 1}</td>

                    <td className={`${cellBorder} ${cellBase}`}>
                      <div className="flex items-center gap-2.5">
                        <UserAvatar
                          firstName={attendee.firstName}
                          lastName={attendee.lastName}
                        />
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-gray-900">
                            {attendee.firstName} {attendee.lastName}
                          </span>
                          <span
                            className="block truncate text-[11px] text-gray-400"
                            title={attendee.email}
                          >
                            {attendee.email}
                          </span>
                        </span>
                      </div>
                    </td>

                    <td className={`${cellBorder} ${cellBase} text-gray-600`}>
                      {attendee.department ?? 'N/A'}
                    </td>

                    <td className={`${cellBorder} ${cellBase} text-gray-600 tabular-nums`}>
                      {attendee.firstPingAt ? formatTimeOfDay(attendee.firstPingAt) : '—'}
                    </td>

                    <td className={`${cellBorder} ${cellBase}`}>
                      {attendee.lastPingAt ? (
                        <span
                          className={stale ? 'text-amber-600' : 'text-gray-600'}
                          title={stale ? 'No reading in the last few minutes' : undefined}
                        >
                          {formatRelativeTime(attendee.lastPingAt)}
                        </span>
                      ) : (
                        <span className="text-gray-400">No readings yet</span>
                      )}
                    </td>

                    <td className={`${cellBorder} ${cellBase} text-gray-600 tabular-nums`}>
                      {attendee.distanceMeters != null
                        ? formatDistanceMeters(attendee.distanceMeters)
                        : '—'}
                    </td>

                    <td className={`${cellBorder} ${cellBase}`}>
                      <LiveCoverageBar ratio={attendee.insideRatio ?? null} />
                    </td>

                    <td className={`${cellBorder} ${cellBase}`}>
                      <LiveStateBadge state={attendee.state} />
                    </td>
                  </tr>
                )
              })}

            {!showSkeleton &&
              attendees.length > 0 &&
              fillers.map((_, index) => (
                <tr key={`filler-${index}`} aria-hidden className="odd:bg-gray-50/40">
                  <td className={`${gutter} ${cellBase} px-0`} />
                  {LIVE_ATTENDANCE_COLUMNS.map((column) => (
                    <td key={column.key} className={`${cellBorder} ${cellBase}`} />
                  ))}
                </tr>
              ))}

            {!showSkeleton && attendees.length > 0 && remainder > 0 && (
              <tr aria-hidden style={{ height: remainder }} className="odd:bg-gray-50/40">
                <td className={`${gutter} p-0`} />
                {LIVE_ATTENDANCE_COLUMNS.map((column) => (
                  <td key={column.key} className={`${cellBorder} p-0`} />
                ))}
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-gray-200 bg-gray-50 px-4 py-2.5">
        {showSkeleton ? (
          <Skeleton className="h-3 w-40" />
        ) : (
          <p className="text-[12px] text-gray-500">
            {attendees.length === 0
              ? 'No volunteers to show'
              : `Showing ${start + 1}–${start + rows.length} of ${attendees.length}`}
          </p>
        )}

        <TablePagination
          page={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
      </div>
    </div>
  )
}
