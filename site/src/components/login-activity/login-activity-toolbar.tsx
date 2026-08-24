import { Download, Search } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import {
  LOGIN_OUTCOME_FILTERS,
  LOGIN_RANGE_FILTERS,
  LOGIN_SOURCE_FILTERS,
  type LoginOutcomeFilter,
  type LoginSourceFilter,
} from '../../constants/login-activity'
import type { LoginActivityRange } from '../../types/login-activity'

interface LoginActivityToolbarProps {
  search: string
  outcome: LoginOutcomeFilter
  source: LoginSourceFilter
  range: LoginActivityRange
  /** Attempts scrolled in so far — the grid loads the trail a page at a time. */
  loaded: number
  total: number
  /** Counts describe what is loaded, not the whole trail, so they grow while scrolling. */
  failed: number
  successful: number
  /** False until the first fetch settles, so the counts don't flash "0 of 0 attempts". */
  initialized: boolean
  onSearchChange: (value: string) => void
  onOutcomeChange: (value: LoginOutcomeFilter) => void
  onSourceChange: (value: LoginSourceFilter) => void
  onRangeChange: (value: LoginActivityRange) => void
  onExport: () => void
}

const selectClass =
  'h-9 rounded-lg border border-gray-200 bg-white px-3 text-[13px] text-gray-700 focus:border-transparent focus:ring-2 focus:ring-[var(--cares-primary)] focus:outline-none'

export function LoginActivityToolbar({
  search,
  outcome,
  source,
  range,
  loaded,
  total,
  failed,
  successful,
  initialized,
  onSearchChange,
  onOutcomeChange,
  onSourceChange,
  onRangeChange,
  onExport,
}: LoginActivityToolbarProps) {
  return (
    <div className="mb-4 flex shrink-0 flex-col gap-3">
      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Login Activity</h1>
        {initialized ? (
          <>
            <p className="text-[13px] text-gray-500">
              {loaded} of {total} attempts loaded
            </p>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-0.5 text-[12px] text-red-700">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
              {failed} failed
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-0.5 text-[12px] text-green-700">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              {successful} successful
            </span>
          </>
        ) : (
          <>
            <Skeleton aria-hidden className="h-3.5 w-24" />
            <Skeleton aria-hidden className="h-5 w-20 rounded-full" />
            <Skeleton aria-hidden className="h-5 w-24 rounded-full" />
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
            placeholder="Search email, name, or IP"
            className="h-9 w-full rounded-lg border border-gray-200 bg-white pr-3 pl-9 text-[13px] text-gray-700 focus:border-transparent focus:ring-2 focus:ring-[var(--cares-primary)] focus:outline-none"
          />
        </div>

        <select
          aria-label="Filter by outcome"
          value={outcome}
          onChange={(event) => onOutcomeChange(event.target.value as LoginOutcomeFilter)}
          className={selectClass}
        >
          {LOGIN_OUTCOME_FILTERS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter by source"
          value={source}
          onChange={(event) => onSourceChange(event.target.value as LoginSourceFilter)}
          className={selectClass}
        >
          {LOGIN_SOURCE_FILTERS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter by time range"
          value={range}
          onChange={(event) => onRangeChange(event.target.value as LoginActivityRange)}
          className={selectClass}
        >
          {LOGIN_RANGE_FILTERS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={onExport}
          title="Exports the attempts loaded so far"
          className="flex h-9 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-[13px] text-gray-700 transition-colors hover:bg-gray-50"
        >
          <Download className="h-3.5 w-3.5" />
          Export
        </button>
      </div>
    </div>
  )
}
