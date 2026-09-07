import { ArrowUpDown, MoreVertical } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import {
  EVENT_CELL_BASE,
  EVENT_CELL_BORDER,
  EVENT_COLUMNS,
  EVENT_GUTTER_CELL,
  EVENT_HEADER_HEIGHT_PX,
  EVENT_ROW_HEIGHT_PX,
  type EventSortKey,
} from '../../../constants/manage-events'
import { useRowsPerPage } from '../../../hooks/use-rows-per-page'
import type { EventTableRow } from '../../../types/event'
import { TablePagination } from '../../portal/ui/table-pagination'
import { ManageEventsTableSkeleton } from './manage-events-table-skeleton'
import { EventImage } from './event-image'
import { EventStatusBadge } from './event-status-badge'

export interface EventSortConfig {
  key: EventSortKey | null
  direction: 'asc' | 'desc'
}

interface ManageEventsTableProps {
  events: EventTableRow[]
  loading: boolean
  /** False until the first fetch settles — see `event-store`. */
  initialized: boolean
  page: number
  sortConfig: EventSortConfig
  hasActiveFilters: boolean
  onPageChange: (page: number) => void
  onSort: (key: EventSortKey) => void
  onView: (event: EventTableRow) => void
  onOpenActions: (event: EventTableRow, button: HTMLButtonElement) => void
  /** Row whose actions menu is currently open, so its trigger can stay highlighted. */
  activeActionsEventId: number | null
  onClearFilters: () => void
  onCreate: () => void
}

const cellBorder = EVENT_CELL_BORDER
const cellBase = EVENT_CELL_BASE
const gutter = EVENT_GUTTER_CELL

/** The thumbnail's empty box, shared by "no photo" and a photo that failed to load. */
function EventImagePlaceholder() {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gray-100 text-xs text-gray-400">
      —
    </div>
  )
}

export function ManageEventsTable({
  events,
  loading,
  initialized,
  page,
  sortConfig,
  hasActiveFilters,
  onPageChange,
  onSort,
  onView,
  onOpenActions,
  activeActionsEventId,
  onClearFilters,
  onCreate,
}: ManageEventsTableProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const { rowsPerPage, remainder } = useRowsPerPage(
    scrollRef,
    EVENT_ROW_HEIGHT_PX,
    EVENT_HEADER_HEIGHT_PX,
  )

  // Covers the mount render too, where `loading` has not flipped true yet. A refilter
  // or refetch keeps existing rows on screen instead of blanking the grid.
  const showSkeleton = !initialized || (loading && events.length === 0)

  const totalPages = Math.max(1, Math.ceil(events.length / rowsPerPage))
  const currentPage = Math.min(page, totalPages)
  const start = (currentPage - 1) * rowsPerPage
  const rows = events.slice(start, start + rowsPerPage)
  const fillers = Array.from({ length: Math.max(0, rowsPerPage - rows.length) })

  useEffect(() => {
    if (page > totalPages) onPageChange(totalPages)
  }, [page, totalPages, onPageChange])

  return (
    <div
      aria-busy={showSkeleton}
      className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
    >
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-x-auto overflow-y-auto">
        <table className="w-full min-w-[64rem] table-fixed border-separate border-spacing-0">
          <thead className="sticky top-0 z-20">
            <tr>
              <th
                scope="col"
                className={`${gutter} z-30 h-9 border-b border-gray-200 px-0 font-semibold`}
              >
                #
              </th>
              {EVENT_COLUMNS.map((column) => {
                const active = column.sortKey && sortConfig.key === column.sortKey
                return (
                  <th
                    key={column.key}
                    scope="col"
                    onClick={
                      column.sortKey ? () => onSort(column.sortKey as EventSortKey) : undefined
                    }
                    className={`${cellBorder} ${column.width} h-9 border-b border-gray-200 bg-gray-50 px-3 text-left text-[11px] font-semibold tracking-wider text-gray-500 uppercase ${
                      column.sortKey ? 'cursor-pointer select-none hover:bg-gray-100' : ''
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      {column.label}
                      {column.sortKey && (
                        <ArrowUpDown
                          className={`h-3 w-3 ${
                            active ? 'text-[var(--cares-primary)]' : 'text-gray-400'
                          }`}
                        />
                      )}
                    </span>
                  </th>
                )
              })}
            </tr>
          </thead>

          <tbody>
            {showSkeleton && <ManageEventsTableSkeleton rows={rowsPerPage} />}

            {!showSkeleton && events.length === 0 && (
              <tr>
                <td
                  colSpan={EVENT_COLUMNS.length + 1}
                  className="h-32 text-center text-sm text-gray-500"
                >
                  <p>{hasActiveFilters ? 'No events match your filters' : 'No events found'}</p>
                  <button
                    type="button"
                    onClick={hasActiveFilters ? onClearFilters : onCreate}
                    className={`mt-3 rounded-lg px-3 py-1.5 text-[13px] ${
                      hasActiveFilters
                        ? 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                        : 'bg-[var(--cares-primary)] text-white hover:opacity-90'
                    }`}
                  >
                    {hasActiveFilters ? 'Clear filters' : 'Create your first event'}
                  </button>
                </td>
              </tr>
            )}

            {!showSkeleton &&
              rows.map((event, index) => {
                const hasDonation = event.funds || event.goods
                return (
                  <tr
                    key={event.id}
                    tabIndex={0}
                    onClick={() => onView(event)}
                    onKeyDown={(keyEvent) => {
                      if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
                        keyEvent.preventDefault()
                        onView(event)
                      }
                    }}
                    className={`cursor-pointer outline-none hover:bg-green-50/60 focus-visible:bg-green-50/60 ${
                      hasDonation ? 'bg-green-50/70' : 'odd:bg-gray-50/40'
                    }`}
                  >
                    <td className={`${gutter} ${cellBase} px-0`}>{start + index + 1}</td>

                    <td className={`${cellBorder} ${cellBase} text-gray-900`}>
                      {event.event_id}
                    </td>

                    <td className={`${cellBorder} ${cellBase}`}>
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--cares-primary)] text-[11px] font-medium text-white">
                          {event.organizer.charAt(0)}
                        </div>
                        <span className="truncate text-gray-900">{event.organizer}</span>
                      </div>
                    </td>

                    <td className={`${cellBorder} ${cellBase}`} title={event.title}>
                      <div className="flex items-center gap-3">
                        {event.event_image ? (
                          <EventImage
                            eventId={event.event_id}
                            index={0}
                            alt=""
                            className="h-9 w-9 shrink-0 rounded-md object-cover"
                            fallback={<EventImagePlaceholder />}
                          />
                        ) : (
                          <EventImagePlaceholder />
                        )}
                        <span className="truncate font-medium text-gray-900">
                          {event.title}
                        </span>
                      </div>
                    </td>

                    <td className={`${cellBorder} ${cellBase} text-gray-600`} title={event.location}>
                      {event.location}
                    </td>

                    <td className={`${cellBorder} ${cellBase} text-gray-600`}>{event.type}</td>

                    <td className={`${cellBorder} ${cellBase} tabular-nums text-gray-900`}>
                      <span className="font-medium text-[var(--cares-primary)]">
                        {event.currentParticipants}
                      </span>{' '}
                      / {event.maxParticipants}
                    </td>

                    <td className={`${cellBorder} ${cellBase} text-gray-600`}>
                      {event.timeRange}
                    </td>

                    <td className={`${cellBorder} ${cellBase}`}>
                      <EventStatusBadge status={event.status} />
                    </td>

                    <td className={`${cellBorder} ${cellBase} tabular-nums text-gray-600`}>
                      {event.date}
                    </td>

                    <td className={`${cellBorder} ${cellBase} overflow-visible px-2 text-right`}>
                      <button
                        type="button"
                        data-event-actions-trigger=""
                        title="Actions"
                        aria-label={`Actions for ${event.title}`}
                        aria-haspopup="menu"
                        aria-expanded={activeActionsEventId === event.id}
                        onClick={(clickEvent) => {
                          clickEvent.stopPropagation()
                          onOpenActions(event, clickEvent.currentTarget)
                        }}
                        className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-gray-100 hover:text-gray-900 ${
                          activeActionsEventId === event.id
                            ? 'bg-gray-100 text-gray-900'
                            : 'text-gray-500'
                        }`}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                )
              })}

            {!showSkeleton &&
              events.length > 0 &&
              fillers.map((_, index) => (
                <tr key={`filler-${index}`} aria-hidden className="odd:bg-gray-50/40">
                  <td className={`${gutter} ${cellBase} px-0`} />
                  {EVENT_COLUMNS.map((column) => (
                    <td key={column.key} className={`${cellBorder} ${cellBase}`} />
                  ))}
                </tr>
              ))}

            {!showSkeleton && events.length > 0 && remainder > 0 && (
              <tr aria-hidden style={{ height: remainder }} className="odd:bg-gray-50/40">
                <td className={`${gutter} p-0`} />
                {EVENT_COLUMNS.map((column) => (
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
            {events.length === 0
              ? 'No events to show'
              : `Showing ${start + 1}–${start + rows.length} of ${events.length}`}
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
