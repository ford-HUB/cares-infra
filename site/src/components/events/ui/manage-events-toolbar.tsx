import { Plus, Search, X } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import {
  EVENT_STATUS_FILTERS,
  EVENT_TIME_FILTERS,
  type EventStatusFilter,
  type EventTimeFilter,
} from '../../../constants/event-filters'

interface ManageEventsToolbarProps {
  search: string
  time: EventTimeFilter
  status: EventStatusFilter
  type: string
  types: string[]
  shown: number
  total: number
  upcoming: number
  hasActiveFilters: boolean
  /** False until the first fetch settles, so the counts don't flash "0 of 0 events". */
  initialized: boolean
  onSearchChange: (value: string) => void
  onTimeChange: (value: EventTimeFilter) => void
  onStatusChange: (value: EventStatusFilter) => void
  onTypeChange: (value: string) => void
  onClearFilters: () => void
  onCreate: () => void
}

const selectClass =
  'h-9 rounded-lg border border-gray-200 bg-white px-3 text-[13px] text-gray-700 focus:border-transparent focus:ring-2 focus:ring-[var(--cares-primary)] focus:outline-none'

export function ManageEventsToolbar({
  search,
  time,
  status,
  type,
  types,
  shown,
  total,
  upcoming,
  hasActiveFilters,
  initialized,
  onSearchChange,
  onTimeChange,
  onStatusChange,
  onTypeChange,
  onClearFilters,
  onCreate,
}: ManageEventsToolbarProps) {
  return (
    <div className="mb-4 flex shrink-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-semibold text-gray-900">All Events</h1>
        {initialized ? (
          <>
            <p className="text-[13px] text-gray-500">
              {shown} of {total} events
            </p>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-0.5 text-[12px] text-green-700">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              {upcoming} upcoming
            </span>
          </>
        ) : (
          <>
            <Skeleton aria-hidden className="h-3.5 w-24" />
            <Skeleton aria-hidden className="h-5 w-20 rounded-full" />
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search event, venue or organizer"
            className="h-9 w-full rounded-lg border border-gray-200 bg-white pr-3 pl-9 text-[13px] text-gray-700 focus:border-transparent focus:ring-2 focus:ring-[var(--cares-primary)] focus:outline-none"
          />
        </div>

        <select
          aria-label="Filter by time"
          value={time}
          onChange={(event) => onTimeChange(event.target.value as EventTimeFilter)}
          className={selectClass}
        >
          {EVENT_TIME_FILTERS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter by status"
          value={status}
          onChange={(event) => onStatusChange(event.target.value as EventStatusFilter)}
          className={selectClass}
        >
          {EVENT_STATUS_FILTERS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter by type"
          value={type}
          onChange={(event) => onTypeChange(event.target.value)}
          className={selectClass}
        >
          <option value="">All Types</option>
          {types.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="flex h-9 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-[13px] text-gray-700 transition-colors hover:bg-gray-50"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </button>
        )}

        <button
          type="button"
          onClick={onCreate}
          className="flex h-9 items-center gap-2 rounded-lg bg-[var(--cares-primary)] px-3 text-[13px] text-white transition-opacity hover:opacity-90"
        >
          <Plus className="h-3.5 w-3.5" />
          Create Event
        </button>
      </div>
    </div>
  )
}
