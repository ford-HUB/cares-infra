import { Megaphone } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { formatNumber, formatRelativeTime } from '../../constants/formatting'
import {
  ANNOUNCEMENT_STATE_BAR_STYLES,
  ANNOUNCEMENT_STATE_DOT_STYLES,
  ANNOUNCEMENT_STATE_FILTER_ALL,
  ANNOUNCEMENT_STATE_HINTS,
  ANNOUNCEMENT_STATE_LABELS,
  ANNOUNCEMENT_STATE_ORDER,
  type AnnouncementStateFilter,
} from '../../constants/maintenance'
import type { AnnouncementState } from '../../types/maintenance'

interface SystemNoticeBannerProps {
  counts: Record<AnnouncementStateFilter, number>
  /** When the most recent notice went out; null while nothing has published. */
  lastPublishedAt: string | null
  filter: AnnouncementStateFilter
  onFilterChange: (filter: AnnouncementStateFilter) => void
}

/**
 * What the page is opened to find out: how many notices users are reading right now.
 * The four states are parts of one board, so they render as segments of a single bar
 * rather than four tiles — and each legend entry filters the feed below it.
 */
export function SystemNoticeBanner({
  counts,
  lastPublishedAt,
  filter,
  onFilterChange,
}: SystemNoticeBannerProps) {
  const total = counts[ANNOUNCEMENT_STATE_FILTER_ALL]
  const live = counts.published

  const toggle = (state: AnnouncementState) =>
    onFilterChange(filter === state ? ANNOUNCEMENT_STATE_FILTER_ALL : state)

  return (
    <Card size="sm" className="shadow-sm">
      <CardContent className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="flex items-center gap-3 lg:w-64 lg:shrink-0">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <Megaphone className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] tracking-wider text-gray-500 uppercase">
              Out right now
            </p>
            <p className="text-2xl font-semibold text-gray-900 tabular-nums">
              {formatNumber(live)}
              <span className="ml-1 text-[13px] font-normal text-gray-400">
                of {formatNumber(total)} notices
              </span>
            </p>
            <p className="truncate text-[11px] text-gray-400">
              {lastPublishedAt
                ? `Newest went out ${formatRelativeTime(lastPublishedAt)}`
                : 'Nothing has been published yet'}
            </p>
          </div>
        </div>

        <div className="hidden w-px self-stretch bg-gray-100 lg:block" />

        <div className="min-w-0 flex-1 space-y-2">
          <TooltipProvider>
            {/* A board of zero notices still draws its track, not a divide-by-zero. */}
            <div className="flex h-2 w-full gap-0.5 overflow-hidden rounded-full bg-gray-100">
              {ANNOUNCEMENT_STATE_ORDER.map((state) =>
                counts[state] > 0 ? (
                  <Tooltip key={state}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        aria-label={`${counts[state]} ${ANNOUNCEMENT_STATE_LABELS[state]}`}
                        aria-pressed={filter === state}
                        onClick={() => toggle(state)}
                        style={{ flexGrow: counts[state] }}
                        className={cn(
                          'h-full transition-opacity focus-visible:ring-2 focus-visible:ring-[var(--cares-primary)] focus-visible:outline-none',
                          ANNOUNCEMENT_STATE_BAR_STYLES[state],
                          filter !== ANNOUNCEMENT_STATE_FILTER_ALL &&
                            filter !== state &&
                            'opacity-30',
                        )}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      {ANNOUNCEMENT_STATE_LABELS[state]} — {ANNOUNCEMENT_STATE_HINTS[state]}
                    </TooltipContent>
                  </Tooltip>
                ) : null,
              )}
            </div>
          </TooltipProvider>

          <div className="flex flex-wrap gap-1.5">
            {ANNOUNCEMENT_STATE_ORDER.map((state) => (
              <button
                key={state}
                type="button"
                aria-pressed={filter === state}
                onClick={() => toggle(state)}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12px] transition-colors focus-visible:ring-2 focus-visible:ring-[var(--cares-primary)] focus-visible:outline-none',
                  filter === state ? 'bg-gray-100' : 'hover:bg-gray-50',
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    'h-2 w-2 rounded-full',
                    ANNOUNCEMENT_STATE_DOT_STYLES[state],
                  )}
                />
                <span className="text-gray-600">
                  {ANNOUNCEMENT_STATE_LABELS[state]}
                </span>
                <span className="font-semibold text-gray-900 tabular-nums">
                  {counts[state]}
                </span>
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
