import { Search } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import {
  PERIOD_FILTER_ALL,
  formatReportPeriod,
  type PeriodFilter,
} from '../../constants/monthly-report'

interface MonthlyReportToolbarProps {
  title: string
  description: string
  /** What the count on the right of the title is counting, e.g. `submissions`. */
  noun: string
  search: string
  period: PeriodFilter
  /** Every `YYYY-MM` that has at least one submission, newest first. */
  periods: string[]
  shown: number
  total: number
  /** False until the first fetch settles, so the counts don't flash "0 of 0". */
  initialized: boolean
  onSearchChange: (value: string) => void
  onPeriodChange: (value: PeriodFilter) => void
}

export function MonthlyReportToolbar({
  title,
  description,
  noun,
  search,
  period,
  periods,
  shown,
  total,
  initialized,
  onSearchChange,
  onPeriodChange,
}: MonthlyReportToolbarProps) {
  return (
    <div className="mb-4 flex shrink-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <div className="flex items-baseline gap-3">
          <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
          {initialized ? (
            <p className="text-[13px] text-gray-500 tabular-nums">
              {shown} of {total} {noun}
            </p>
          ) : (
            <Skeleton aria-hidden className="h-3.5 w-24" />
          )}
        </div>
        <p className="mt-0.5 text-[13px] text-gray-500">{description}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search reference, coordinator or department"
            className="h-9 w-full rounded-lg border border-gray-200 bg-white pr-3 pl-9 text-[13px] text-gray-700 focus:border-transparent focus:ring-2 focus:ring-[var(--cares-primary)] focus:outline-none"
          />
        </div>

        <select
          aria-label="Filter by reporting period"
          value={period}
          onChange={(event) => onPeriodChange(event.target.value as PeriodFilter)}
          className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-[13px] text-gray-700 focus:border-transparent focus:ring-2 focus:ring-[var(--cares-primary)] focus:outline-none"
        >
          <option value={PERIOD_FILTER_ALL}>All periods</option>
          {periods.map((one) => (
            <option key={one} value={one}>
              {formatReportPeriod(one)}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
