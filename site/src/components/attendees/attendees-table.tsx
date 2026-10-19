import { useEffect, useRef } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ATTENDEE_CELL_BASE,
  ATTENDEE_CELL_BORDER,
  ATTENDEE_COLUMNS,
  ATTENDEE_GUTTER_CELL,
  ATTENDEE_HEADER_HEIGHT_PX,
  ATTENDEE_ROW_HEIGHT_PX,
  ATTENDEE_SELECT_CELL,
  GEO_VALIDATION_METHOD_LABELS,
  isManuallyMarkable,
} from '../../constants/attendees'
import { formatDateShort, formatTimeOfDay } from '../../constants/formatting'
import { useRowsPerPage } from '../../hooks/use-rows-per-page'
import type { EventAttendee } from '../../types/attendee'
import { AttendanceStatusBadge } from '../portal/ui/attendance-status-badge'
import { TablePagination } from '../portal/ui/table-pagination'
import { UserAvatar } from '../portal/ui/user-avatar'
import { AttendeesTableSkeleton } from './ui/attendees-table-skeleton'

interface AttendeesTableProps {
  attendees: EventAttendee[]
  loading: boolean
  /** False until the first fetch settles — see `attendee-store`. */
  initialized: boolean
  page: number
  onPageChange: (page: number) => void
  onView: (attendee: EventAttendee) => void
  /**
   * Set only for accounts that may mark attendance by hand — the checkbox column is
   * drawn when present. Rows that cannot be marked (event not over, or already
   * completed) show a disabled box.
   */
  selection?: {
    selectedIds: ReadonlySet<string>
    /** Markable rows across the whole filtered list, not just this page. */
    markableCount: number
    onToggle: (attendee: EventAttendee) => void
    onToggleAll: () => void
  }
}

function SelectAllCheckbox({
  checked,
  indeterminate,
  disabled,
  onChange,
  label,
}: {
  checked: boolean
  indeterminate: boolean
  disabled: boolean
  onChange: () => void
  label: string
}) {
  return (
    <input
      type="checkbox"
      aria-label={label}
      title={label}
      checked={checked}
      disabled={disabled}
      ref={(node) => {
        if (node) node.indeterminate = indeterminate
      }}
      onChange={onChange}
      className="h-4 w-4 cursor-pointer rounded border-gray-300 text-[var(--cares-primary)] focus:ring-2 focus:ring-[var(--cares-primary)] disabled:cursor-not-allowed disabled:opacity-40"
    />
  )
}

const cellBorder = ATTENDEE_CELL_BORDER
const cellBase = ATTENDEE_CELL_BASE
const gutter = ATTENDEE_GUTTER_CELL

export function AttendeesTable({
  attendees,
  loading,
  initialized,
  page,
  onPageChange,
  onView,
  selection,
}: AttendeesTableProps) {
  const selectable = Boolean(selection)
  const columnCount = ATTENDEE_COLUMNS.length + (selectable ? 1 : 0)
  const selectedCount = selection?.selectedIds.size ?? 0
  const markableCount = selection?.markableCount ?? 0
  const scrollRef = useRef<HTMLDivElement>(null)
  const { rowsPerPage, remainder } = useRowsPerPage(
    scrollRef,
    ATTENDEE_ROW_HEIGHT_PX,
    ATTENDEE_HEADER_HEIGHT_PX,
  )

  // Covers the mount render too, where `loading` has not flipped true yet. A refilter
  // keeps existing rows on screen instead of blanking the grid.
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
      aria-busy={showSkeleton}
      className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
    >
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-x-auto overflow-y-auto">
        <table className="w-full min-w-[56rem] table-fixed border-separate border-spacing-0">
          <thead className="sticky top-0 z-20">
            <tr>
              <th
                scope="col"
                className={`${gutter} z-30 h-9 border-b border-gray-200 px-0 font-semibold`}
              >
                #
              </th>
              {selection && (
                <th
                  scope="col"
                  className={`${ATTENDEE_SELECT_CELL} h-9 border-b border-gray-200 bg-gray-50`}
                >
                  <SelectAllCheckbox
                    label={
                      markableCount === 0
                        ? 'No participants here can be marked present'
                        : `Select all ${markableCount} participants that can be marked present`
                    }
                    checked={markableCount > 0 && selectedCount >= markableCount}
                    indeterminate={selectedCount > 0 && selectedCount < markableCount}
                    disabled={markableCount === 0}
                    onChange={selection.onToggleAll}
                  />
                </th>
              )}
              {ATTENDEE_COLUMNS.map((column) => (
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
              <AttendeesTableSkeleton rows={rowsPerPage} selectable={selectable} />
            )}

            {!showSkeleton && attendees.length === 0 && (
              <tr>
                <td
                  colSpan={columnCount + 1}
                  className="h-32 text-center text-sm text-gray-500"
                >
                  No attendees match the current filters.
                </td>
              </tr>
            )}

            {!showSkeleton &&
              rows.map((attendee, index) => (
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

                  {selection && (
                    <td
                      className={`${cellBase} ${ATTENDEE_SELECT_CELL}`}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <RowCheckbox
                        attendee={attendee}
                        checked={selection.selectedIds.has(attendee.id)}
                        onToggle={selection.onToggle}
                      />
                    </td>
                  )}

                  <td className={`${cellBorder} ${cellBase}`}>
                    <div className="flex items-center gap-2.5">
                      <UserAvatar
                        firstName={attendee.firstName}
                        lastName={attendee.lastName}
                      />
                      <span className="truncate font-medium text-gray-900">
                        {attendee.firstName} {attendee.lastName}
                      </span>
                    </div>
                  </td>

                  <td
                    className={`${cellBorder} ${cellBase} text-gray-600`}
                    title={attendee.email}
                  >
                    {attendee.email}
                  </td>

                  <td className={`${cellBorder} ${cellBase} text-gray-600`}>
                    {attendee.department ?? 'N/A'}
                  </td>

                  <td
                    className={`${cellBorder} ${cellBase} text-gray-600`}
                    title={attendee.eventTitle}
                  >
                    {attendee.eventTitle}
                    <span className="ml-1.5 text-[11px] text-gray-400">
                      {formatDateShort(attendee.eventDate)}
                    </span>
                  </td>

                  <td className={`${cellBorder} ${cellBase} text-gray-600 tabular-nums`}>
                    {attendee.checkedInAt ? formatTimeOfDay(attendee.checkedInAt) : '—'}
                  </td>

                  <td className={`${cellBorder} ${cellBase} text-gray-600`}>
                    {attendee.validationMethod
                      ? GEO_VALIDATION_METHOD_LABELS[attendee.validationMethod]
                      : '—'}
                  </td>

                  <td className={`${cellBorder} ${cellBase}`}>
                    <AttendanceStatusBadge status={attendee.status} />
                  </td>
                </tr>
              ))}

            {!showSkeleton &&
              attendees.length > 0 &&
              fillers.map((_, index) => (
                <tr key={`filler-${index}`} aria-hidden className="odd:bg-gray-50/40">
                  <td className={`${gutter} ${cellBase} px-0`} />
                  {selectable && <td className={`${cellBase} ${ATTENDEE_SELECT_CELL}`} />}
                  {ATTENDEE_COLUMNS.map((column) => (
                    <td key={column.key} className={`${cellBorder} ${cellBase}`} />
                  ))}
                </tr>
              ))}

            {!showSkeleton && attendees.length > 0 && remainder > 0 && (
              <tr aria-hidden style={{ height: remainder }} className="odd:bg-gray-50/40">
                <td className={`${gutter} p-0`} />
                {selectable && <td className={`${ATTENDEE_SELECT_CELL} p-0`} />}
                {ATTENDEE_COLUMNS.map((column) => (
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
              ? 'No attendees to show'
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

function RowCheckbox({
  attendee,
  checked,
  onToggle,
}: {
  attendee: EventAttendee
  checked: boolean
  onToggle: (attendee: EventAttendee) => void
}) {
  const markable = isManuallyMarkable(attendee)
  const name = `${attendee.firstName} ${attendee.lastName}`
  const hint = markable
    ? `Select ${name}`
    : attendee.status === 'completed'
      ? 'Already completed'
      : 'Available once the event has ended'

  return (
    <input
      type="checkbox"
      aria-label={hint}
      title={hint}
      checked={markable && checked}
      disabled={!markable}
      onChange={() => onToggle(attendee)}
      onKeyDown={(event) => event.stopPropagation()}
      className="h-4 w-4 cursor-pointer rounded border-gray-300 text-[var(--cares-primary)] focus:ring-2 focus:ring-[var(--cares-primary)] disabled:cursor-not-allowed disabled:opacity-40"
    />
  )
}
