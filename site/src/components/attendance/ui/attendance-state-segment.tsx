import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  LIVE_STATE_BAR_STYLES,
  LIVE_STATE_HINTS,
  LIVE_STATE_LABELS,
} from '../../../constants/attendance'
import { formatPercent } from '../../../constants/formatting'
import type { LiveAttendanceState } from '../../../types/attendance'
import { LivePulse } from './live-pulse'

interface AttendanceStateSegmentProps {
  state: LiveAttendanceState
  value: number
  /** 0–1. */
  share: number
  active: boolean
  onToggle: (state: LiveAttendanceState) => void
}

/** Legend entry that doubles as the table's state filter; clicking again clears it. */
export function AttendanceStateSegment({
  state,
  value,
  share,
  active,
  onToggle,
}: AttendanceStateSegmentProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-pressed={active}
          onClick={() => onToggle(state)}
          className={cn(
            'flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors',
            'focus-visible:ring-2 focus-visible:ring-[var(--cares-primary)] focus-visible:outline-none',
            active ? 'bg-gray-100' : 'hover:bg-gray-50',
          )}
        >
          <span
            className={cn(
              'h-7 w-1 shrink-0 rounded-full',
              LIVE_STATE_BAR_STYLES[state],
              !active && 'opacity-70',
            )}
          />
          <span className="min-w-0">
            <span className="flex items-center gap-1.5 text-[11px] tracking-wider text-gray-500 uppercase">
              {state === 'in_area' && <LivePulse colorClass="bg-emerald-500" animate />}
              <span className="truncate">{LIVE_STATE_LABELS[state]}</span>
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
        {LIVE_STATE_HINTS[state]}
        {active ? ' Click to clear the filter.' : ' Click to filter the table.'}
      </TooltipContent>
    </Tooltip>
  )
}
