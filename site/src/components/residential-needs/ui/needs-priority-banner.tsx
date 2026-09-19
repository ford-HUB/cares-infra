import { HousePlus } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { formatNumber, formatPercent } from '../../../constants/formatting'
import {
  NEED_PRIORITY_BAR_STYLES,
  NEED_PRIORITY_LABELS,
  NEED_PRIORITY_ORDER,
  NEED_PRIORITY_THRESHOLDS,
  NEEDS_FILTER_ALL,
} from '../../../constants/residential-needs'
import type { NeedPriority } from '../../../types/residential-needs'

export type PriorityFilter = NeedPriority | typeof NEEDS_FILTER_ALL

interface NeedsPriorityBannerProps {
  total: number
  counts: Record<NeedPriority, number>
  filter: PriorityFilter
  onFilterChange: (value: PriorityFilter) => void
}

/**
 * The survey at a glance: how many households need urgent help, of how many surveyed.
 * The four bands are parts of one whole, so they share one bar; each legend entry is
 * the household table's filter for that band.
 */
export function NeedsPriorityBanner({
  total,
  counts,
  filter,
  onFilterChange,
}: NeedsPriorityBannerProps) {
  const share = (value: number) => (total > 0 ? value / total : 0)
  const urgent = counts.critical + counts.high
  const toggle = (next: NeedPriority) =>
    onFilterChange(filter === next ? NEEDS_FILTER_ALL : next)

  return (
    <TooltipProvider>
      <Card size="sm" className="mb-4 shrink-0 shadow-sm">
        <CardContent className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="flex items-center gap-3 lg:w-60 lg:shrink-0">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--cares-tag-volunteer-bg)] text-[var(--cares-tag-volunteer-text)]">
              <HousePlus className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] tracking-wider text-gray-500 uppercase">
                Households needing urgent help
              </p>
              <p className="flex items-baseline gap-1.5">
                <span className="text-2xl leading-tight font-semibold text-gray-900 tabular-nums">
                  {formatNumber(urgent)}
                </span>
                <span className="text-[13px] text-gray-400 tabular-nums">
                  of {formatNumber(total)} surveyed
                </span>
              </p>
            </div>
          </div>

          <div className="hidden w-px self-stretch bg-gray-100 lg:block" />

          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-gray-100">
              {NEED_PRIORITY_ORDER.map((band) => (
                <div
                  key={band}
                  className={cn(
                    'h-full rounded-full transition-[width] duration-500',
                    NEED_PRIORITY_BAR_STYLES[band],
                    filter !== NEEDS_FILTER_ALL && filter !== band && 'opacity-30',
                  )}
                  style={{ width: `${share(counts[band]) * 100}%` }}
                />
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-1 sm:flex-nowrap">
              {NEED_PRIORITY_ORDER.map((band) => {
                const active = filter === band
                return (
                  <Tooltip key={band}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        aria-pressed={active}
                        onClick={() => toggle(band)}
                        className={cn(
                          'flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors',
                          'focus-visible:ring-2 focus-visible:ring-[var(--cares-primary)] focus-visible:outline-none',
                          active ? 'bg-gray-100' : 'hover:bg-gray-50',
                        )}
                      >
                        <span
                          className={cn(
                            'h-7 w-1 shrink-0 rounded-full',
                            NEED_PRIORITY_BAR_STYLES[band],
                            !active && 'opacity-70',
                          )}
                        />
                        <span className="min-w-0">
                          <span className="block truncate text-[11px] tracking-wider text-gray-500 uppercase">
                            {NEED_PRIORITY_LABELS[band]}
                          </span>
                          <span className="flex items-baseline gap-1.5">
                            <span className="text-lg leading-tight font-semibold text-gray-900 tabular-nums">
                              {formatNumber(counts[band])}
                            </span>
                            <span className="text-[12px] text-gray-400 tabular-nums">
                              {formatPercent(share(counts[band]))}
                            </span>
                          </span>
                        </span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      Total need score of {NEED_PRIORITY_THRESHOLDS[band]} or more.
                      {active ? ' Click to clear the filter.' : ' Click to filter the table.'}
                    </TooltipContent>
                  </Tooltip>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}
