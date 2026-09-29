import { RefreshCw, Search } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import {
  SESSION_ROLE_FILTERS,
  SESSION_SOURCE_FILTERS,
  type SessionRoleFilter,
  type SessionSourceFilter,
} from '../../constants/active-sessions'

interface ActiveSessionsToolbarProps {
  search: string
  source: SessionSourceFilter
  role: SessionRoleFilter
  /** Devices scrolled in so far — the grid loads the list a page at a time. */
  loaded: number
  total: number
  /** Counts describe what is loaded, not every session, so they grow while scrolling. */
  activeNow: number
  /** False until the first fetch settles, so the counts don't flash "0 of 0". */
  initialized: boolean
  loading: boolean
  onSearchChange: (value: string) => void
  onSourceChange: (value: SessionSourceFilter) => void
  onRoleChange: (value: SessionRoleFilter) => void
  onRefresh: () => void
}

const selectClass =
  'h-9 rounded-lg border border-gray-200 bg-white px-3 text-[13px] text-gray-700 focus:border-transparent focus:ring-2 focus:ring-[var(--cares-primary)] focus:outline-none'

export function ActiveSessionsToolbar({
  search,
  source,
  role,
  loaded,
  total,
  activeNow,
  initialized,
  loading,
  onSearchChange,
  onSourceChange,
  onRoleChange,
  onRefresh,
}: ActiveSessionsToolbarProps) {
  return (
    <div className="mb-4 flex shrink-0 flex-col gap-3">
      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Active Sessions</h1>
        {initialized ? (
          <>
            <p className="text-[13px] text-gray-500">
              {loaded} of {total} devices loaded
            </p>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-0.5 text-[12px] text-green-700">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              {activeNow} active now
            </span>
          </>
        ) : (
          <>
            <Skeleton aria-hidden className="h-3.5 w-24" />
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
          aria-label="Filter by source"
          value={source}
          onChange={(event) => onSourceChange(event.target.value as SessionSourceFilter)}
          className={selectClass}
        >
          {SESSION_SOURCE_FILTERS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter by role"
          value={role}
          onChange={(event) => onRoleChange(event.target.value as SessionRoleFilter)}
          className={selectClass}
        >
          {SESSION_ROLE_FILTERS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          title="Reloads from the newest session"
          className="flex h-9 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-[13px] text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>
    </div>
  )
}
