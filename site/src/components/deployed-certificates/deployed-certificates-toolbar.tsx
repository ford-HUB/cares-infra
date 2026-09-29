import { Download, LayoutGrid, List, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  DEPLOYMENT_SORT_OPTIONS,
  type DeploymentSort,
  type DeploymentViewMode,
} from '../../constants/deployed-certificates'

export const EVENT_FILTER_ALL = 'all' as const

interface DeployedCertificatesToolbarProps {
  search: string
  /** Event id, or `all`. Status filtering lives in the summary bar instead. */
  event: string
  eventOptions: { value: string; label: string }[]
  sort: DeploymentSort
  view: DeploymentViewMode
  shown: number
  total: number
  /** False until the first fetch settles, so the count doesn't flash "0 of 0". */
  initialized: boolean
  onSearchChange: (value: string) => void
  onEventChange: (value: string) => void
  onSortChange: (value: DeploymentSort) => void
  onViewChange: (value: DeploymentViewMode) => void
  onExport: () => void
}

const selectClass =
  'h-9 max-w-56 rounded-lg border border-gray-200 bg-white px-3 text-[13px] text-gray-700 focus:border-transparent focus:ring-2 focus:ring-[var(--cares-primary)] focus:outline-none'

export function DeployedCertificatesToolbar({
  search,
  event,
  eventOptions,
  sort,
  view,
  shown,
  total,
  initialized,
  onSearchChange,
  onEventChange,
  onSortChange,
  onViewChange,
  onExport,
}: DeployedCertificatesToolbarProps) {
  return (
    <div className="mb-4 flex shrink-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Live Certificates</h1>
        {initialized ? (
          <p className="text-[13px] text-gray-500 tabular-nums">
            {shown} of {total} deployments
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
            onChange={(input) => onSearchChange(input.target.value)}
            placeholder="Search event, certificate or reference"
            className="h-9 w-full rounded-lg border border-gray-200 bg-white pr-3 pl-9 text-[13px] text-gray-700 focus:border-transparent focus:ring-2 focus:ring-[var(--cares-primary)] focus:outline-none"
          />
        </div>

        <select
          aria-label="Filter by event"
          value={event}
          onChange={(input) => onEventChange(input.target.value)}
          className={selectClass}
        >
          {eventOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          aria-label="Sort deployments"
          value={sort}
          onChange={(input) => onSortChange(input.target.value as DeploymentSort)}
          className={selectClass}
        >
          {DEPLOYMENT_SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {/* One choice of two, so a toggle group rather than two ad-hoc buttons. */}
        <ToggleGroup
          type="single"
          value={view}
          onValueChange={(value) => value && onViewChange(value as DeploymentViewMode)}
          variant="outline"
          size="sm"
          aria-label="Layout"
        >
          <ToggleGroupItem value="grid" aria-label="Gallery view">
            <LayoutGrid className="h-3.5 w-3.5" />
          </ToggleGroupItem>
          <ToggleGroupItem value="table" aria-label="List view">
            <List className="h-3.5 w-3.5" />
          </ToggleGroupItem>
        </ToggleGroup>

        <Button variant="outline" size="sm" className="h-9" onClick={onExport}>
          <Download className="h-3.5 w-3.5" />
          Export
        </Button>
      </div>
    </div>
  )
}
