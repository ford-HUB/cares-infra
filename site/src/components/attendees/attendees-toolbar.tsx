import { Download, Search, UserCheck } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import type { SessionSuspension } from '../../types/access-control'
import { LockedActionButton } from '../portal/ui/locked-action'
import {
  ATTENDEE_EVENT_FILTER_ALL,
  ATTENDEE_STATUS_FILTERS,
  type AttendeeStatusFilter,
} from '../../constants/attendees'
import { formatDateShort } from '../../constants/formatting'
import type { AttendeeEventOption } from '../../types/attendee'

interface AttendeesToolbarProps {
  search: string
  event: string
  status: AttendeeStatusFilter
  events: AttendeeEventOption[]
  shown: number
  total: number
  /** False until the first fetch settles, so the counts don't flash "0 of 0". */
  initialized: boolean
  onSearchChange: (value: string) => void
  onEventChange: (value: string) => void
  onStatusChange: (value: AttendeeStatusFilter) => void
  /** Omitted when the account lacks the export right — the button is not drawn. */
  onExport?: () => void
  /** Set when the export right is suspended — the button is drawn locked instead. */
  exportSuspension?: SessionSuspension
  /** Omitted when the account lacks the manual attendance right — not drawn. */
  onMarkPresent?: () => void
  /** Set when manual attendance is suspended — the button is drawn locked instead. */
  markPresentSuspension?: SessionSuspension
  /** How many rows are ticked; the button stays disabled at zero. */
  selectedCount?: number
}

const selectClass =
  'h-9 rounded-lg border border-gray-200 bg-white px-3 text-[13px] text-gray-700 focus:border-transparent focus:ring-2 focus:ring-[var(--cares-primary)] focus:outline-none'

export function AttendeesToolbar({
  search,
  event,
  status,
  events,
  shown,
  total,
  initialized,
  onSearchChange,
  onEventChange,
  onStatusChange,
  onExport,
  exportSuspension,
  onMarkPresent,
  markPresentSuspension,
  selectedCount = 0,
}: AttendeesToolbarProps) {
  return (
    <div className="mb-4 flex shrink-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Attendees</h1>
        {initialized ? (
          <p className="text-[13px] text-gray-500">
            {shown} of {total} attendees
          </p>
        ) : (
          <Skeleton aria-hidden className="h-3.5 w-28" />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(changeEvent) => onSearchChange(changeEvent.target.value)}
            placeholder="Search name, email or department"
            className="h-9 w-full rounded-lg border border-gray-200 bg-white pr-3 pl-9 text-[13px] text-gray-700 focus:border-transparent focus:ring-2 focus:ring-[var(--cares-primary)] focus:outline-none"
          />
        </div>

        <select
          aria-label="Filter by event"
          value={event}
          onChange={(changeEvent) => onEventChange(changeEvent.target.value)}
          className={`${selectClass} max-w-64`}
        >
          <option value={ATTENDEE_EVENT_FILTER_ALL}>All Events</option>
          {events.map((option) => (
            <option key={option.eventId} value={String(option.eventId)}>
              {option.title} — {formatDateShort(option.eventDate)}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter by attendance status"
          value={status}
          onChange={(changeEvent) =>
            onStatusChange(changeEvent.target.value as AttendeeStatusFilter)
          }
          className={selectClass}
        >
          {ATTENDEE_STATUS_FILTERS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {markPresentSuspension ? (
          <LockedActionButton
            suspension={markPresentSuspension}
            icon={UserCheck}
            label="Mark Present"
          />
        ) : (
          onMarkPresent && (
            <button
              type="button"
              onClick={onMarkPresent}
              disabled={selectedCount === 0}
              title={
                selectedCount === 0
                  ? 'Tick the participants geofence attendance missed'
                  : undefined
              }
              className="flex h-9 items-center gap-2 rounded-lg bg-[var(--cares-primary)] px-3 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <UserCheck className="h-3.5 w-3.5" />
              Mark Present{selectedCount > 0 ? ` (${selectedCount})` : ''}
            </button>
          )
        )}

        {exportSuspension ? (
          <LockedActionButton
            suspension={exportSuspension}
            icon={Download}
            label="Export"
          />
        ) : (
          onExport && (
            <button
              type="button"
              onClick={onExport}
              className="flex h-9 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-[13px] text-gray-700 transition-colors hover:bg-gray-50"
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </button>
          )
        )}
      </div>
    </div>
  )
}
