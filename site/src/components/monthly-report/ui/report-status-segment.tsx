import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { formatPercent } from '../../../constants/formatting'
import {
  REPORT_STATUS_BAR_STYLES,
  REPORT_STATUS_HINTS,
  REPORT_STATUS_LABELS,
} from '../../../constants/monthly-report'
import type { MonthlyReportStatus } from '../../../types/monthly-report'

interface ReportStatusSegmentProps {
  status: MonthlyReportStatus
  value: number
  /** Share of the period's submissions this status holds, 0–1. */
  share: number
  active: boolean
  onToggle: (status: MonthlyReportStatus) => void
}

/**
 * One stage of the review line, as a legend entry under the pipeline bar. It doubles
 * as the queue's filter — clicking narrows the list, clicking again clears it, which
 * is why this is a button and not a plain tile.
 */
export function ReportStatusSegment({
  status,
  value,
  share,
  active,
  onToggle,
}: ReportStatusSegmentProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-pressed={active}
          onClick={() => onToggle(status)}
          className={cn(
            'flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors',
            'focus-visible:ring-2 focus-visible:ring-[var(--cares-primary)] focus-visible:outline-none',
            active ? 'bg-gray-100' : 'hover:bg-gray-50',
          )}
        >
          <span
            className={cn(
              'h-7 w-1 shrink-0 rounded-full',
              REPORT_STATUS_BAR_STYLES[status],
              !active && 'opacity-70',
            )}
          />
          <span className="min-w-0">
            <span className="block truncate text-[11px] tracking-wider text-gray-500 uppercase">
              {REPORT_STATUS_LABELS[status]}
            </span>
            <span className="flex items-baseline gap-1.5">
              <span className="text-lg leading-tight font-semibold text-gray-900 tabular-nums">
                {value}
              </span>
              <span className="text-[12px] text-gray-400 tabular-nums">
                {formatPercent(share)}
              </span>
            </span>
          </span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {REPORT_STATUS_HINTS[status]}
        {active ? ' Click to clear the filter.' : ' Click to filter the queue.'}
      </TooltipContent>
    </Tooltip>
  )
}
