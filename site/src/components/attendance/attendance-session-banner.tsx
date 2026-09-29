import { Users } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { TooltipProvider } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import {
  LIVE_STATE_BAR_STYLES,
  LIVE_STATE_FILTER_ALL,
  LIVE_STATE_LABELS,
  LIVE_STATE_ORDER,
  type LiveStateFilter,
} from '../../constants/attendance'
import type {
  LiveAttendanceCounts,
  LiveAttendanceState,
} from '../../types/attendance'
import { AttendanceStateSegment } from './ui/attendance-state-segment'

interface AttendanceSessionBannerProps {
  counts: LiveAttendanceCounts
  /** The table's current filter — the matching segment reads as selected. */
  state: LiveStateFilter
  onStateChange: (value: LiveStateFilter) => void
}

/**
 * The roster at a glance: how many volunteers the geofence is holding on site right
 * now, and how the rest of the roster splits. The three states are parts of one whole,
 * so they share a single bar instead of four equal-weight tiles — and each part is the
 * table's filter for that state.
 */
export function AttendanceSessionBanner({
  counts,
  state,
  onStateChange,
}: AttendanceSessionBannerProps) {
  const stateCounts: Record<LiveAttendanceState, number> = {
    in_area: counts.inArea,
    outside_area: counts.outsideArea,
    awaiting_sync: counts.awaitingSync,
  }

  const share = (value: number) => (counts.roster > 0 ? value / counts.roster : 0)

  const toggle = (next: LiveAttendanceState) =>
    onStateChange(state === next ? LIVE_STATE_FILTER_ALL : next)

  return (
    <TooltipProvider>
      <Card size="sm" className="mb-4 shrink-0 shadow-sm">
        <CardContent className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="flex items-center gap-3 lg:w-56 lg:shrink-0">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--cares-tag-volunteer-bg)] text-[var(--cares-tag-volunteer-text)]">
              <Users className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] tracking-wider text-gray-500 uppercase">
                {LIVE_STATE_LABELS.in_area} on site
              </p>
              <p className="flex items-baseline gap-1.5">
                <span className="text-2xl leading-tight font-semibold text-gray-900 tabular-nums">
                  {counts.inArea}
                </span>
                <span className="text-[13px] text-gray-400 tabular-nums">
                  of {counts.roster} roster
                </span>
              </p>
            </div>
          </div>

          <div className="hidden w-px self-stretch bg-gray-100 lg:block" />

          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-gray-100">
              {LIVE_STATE_ORDER.map((one) => (
                <div
                  key={one}
                  className={cn(
                    'h-full rounded-full transition-[width] duration-500',
                    LIVE_STATE_BAR_STYLES[one],
                    state !== LIVE_STATE_FILTER_ALL && state !== one && 'opacity-30',
                  )}
                  style={{ width: `${share(stateCounts[one]) * 100}%` }}
                />
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-1 sm:flex-nowrap">
              {LIVE_STATE_ORDER.map((one) => (
                <AttendanceStateSegment
                  key={one}
                  state={one}
                  value={stateCounts[one]}
                  share={share(stateCounts[one])}
                  active={state === one}
                  onToggle={toggle}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}
