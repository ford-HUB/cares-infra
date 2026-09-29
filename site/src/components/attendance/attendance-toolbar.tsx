import { RefreshCw, Search } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import {
  LIVE_STATE_FILTERS,
  type LiveStateFilter,
} from '../../constants/attendance'

interface AttendanceToolbarProps {
  search: string
  state: LiveStateFilter
  shown: number
  total: number
  /** False until the first fetch settles, so the counts don't flash "0 of 0". */
  initialized: boolean
  /** True while a poll or manual refresh is in flight. */
  refreshing: boolean
  onSearchChange: (value: string) => void
  onStateChange: (value: LiveStateFilter) => void
  onRefresh: () => void
}

const selectClass =
  'h-9 rounded-lg border border-gray-200 bg-white px-3 text-[13px] text-gray-700 focus:border-transparent focus:ring-2 focus:ring-[var(--cares-primary)] focus:outline-none'

export function AttendanceToolbar({
  search,
  state,
  shown,
  total,
  initialized,
  refreshing,
  onSearchChange,
  onStateChange,
  onRefresh,
}: AttendanceToolbarProps) {
  return (
    <div className="mb-3 flex shrink-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-baseline gap-3">
        <h2 className="text-[15px] font-semibold text-gray-900">Volunteers on site</h2>
        {initialized ? (
          <p className="text-[13px] text-gray-500">
            {shown} of {total} volunteers
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
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search name, email or department"
            className="h-9 w-full rounded-lg border border-gray-200 bg-white pr-3 pl-9 text-[13px] text-gray-700 focus:border-transparent focus:ring-2 focus:ring-[var(--cares-primary)] focus:outline-none"
          />
        </div>

        <select
          aria-label="Filter by live status"
          value={state}
          onChange={(event) => onStateChange(event.target.value as LiveStateFilter)}
          className={selectClass}
        >
          {LIVE_STATE_FILTERS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="flex h-9 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-[13px] text-gray-700 transition-colors hover:bg-gray-50 disabled:pointer-events-none disabled:opacity-60"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing' : 'Refresh'}
        </button>
      </div>
    </div>
  )
}
