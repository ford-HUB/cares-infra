import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  CPU_BAND_BAR_STYLES,
  CPU_BAND_HINTS,
  CPU_BAND_LABELS,
  formatPercentPoints,
} from '../../../constants/system-performance'
import type { CpuBand } from '../../../types/system-performance'

interface CpuBandSegmentProps {
  band: CpuBand
  /** Percentage points of host capacity this band is holding right now. */
  value: number
  /** This band's share of busy CPU, 0–1 — what the reader compares bands by. */
  shareOfBusy: number
  active: boolean
  onToggle: (band: CpuBand) => void
}

/**
 * One band of CPU time, as a legend entry under the capacity bar — and the chart's
 * focus control: an admin asking "is this our code or is it disk?" clicks the band
 * and the other two drop back on the chart above.
 */
export function CpuBandSegment({
  band,
  value,
  shareOfBusy,
  active,
  onToggle,
}: CpuBandSegmentProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-pressed={active}
          onClick={() => onToggle(band)}
          className={cn(
            'flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors',
            'focus-visible:ring-2 focus-visible:ring-[var(--cares-primary)] focus-visible:outline-none',
            active ? 'bg-gray-100' : 'hover:bg-gray-50',
          )}
        >
          <span
            className={cn(
              'h-7 w-1 shrink-0 rounded-full',
              CPU_BAND_BAR_STYLES[band],
              !active && 'opacity-70',
            )}
          />
          <span className="min-w-0">
            <span className="block truncate text-[11px] tracking-wider text-gray-500 uppercase">
              {CPU_BAND_LABELS[band]}
            </span>
            <span className="flex items-baseline gap-1.5">
              <span className="text-lg leading-tight font-semibold text-gray-900 tabular-nums">
                {formatPercentPoints(value)}
              </span>
              <span className="text-[12px] text-gray-400 tabular-nums">
                {Math.round(shareOfBusy * 100)}% of busy
              </span>
            </span>
          </span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {CPU_BAND_HINTS[band]}
        {active ? ' Click to chart all three again.' : ' Click to focus the chart on it.'}
      </TooltipContent>
    </Tooltip>
  )
}
