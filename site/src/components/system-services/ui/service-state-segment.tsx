import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { formatPercent } from '../../../constants/formatting'
import {
  SERVICE_STATE_BAR_STYLES,
  SERVICE_STATE_HINTS,
  SERVICE_STATE_LABELS,
} from '../../../constants/system-services'
import type { ServiceState } from '../../../types/system-service'
import { LivePulse } from '../../attendance/ui/live-pulse'

interface ServiceStateSegmentProps {
  state: ServiceState
  value: number
  /** Share of the roster this state holds, 0–1. */
  share: number
  active: boolean
  onToggle: (state: ServiceState) => void
}

/**
 * One state of the scheduler roster, as a legend entry under the duty bar. It is the
 * list's filter as well — a director hunting the failing job clicks the red segment
 * rather than reading every row.
 */
export function ServiceStateSegment({
  state,
  value,
  share,
  active,
  onToggle,
}: ServiceStateSegmentProps) {
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
              SERVICE_STATE_BAR_STYLES[state],
              !active && 'opacity-70',
            )}
          />
          <span className="min-w-0">
            <span className="flex items-center gap-1.5 text-[11px] tracking-wider text-gray-500 uppercase">
              {state === 'running' && <LivePulse colorClass="bg-emerald-500" animate />}
              <span className="truncate">{SERVICE_STATE_LABELS[state]}</span>
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
        {SERVICE_STATE_HINTS[state]}
        {active ? ' Click to clear the filter.' : ' Click to filter the list.'}
      </TooltipContent>
    </Tooltip>
  )
}
