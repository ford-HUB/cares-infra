import { ServerCog } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { TooltipProvider } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import {
  SERVICE_STATE_BAR_STYLES,
  SERVICE_STATE_FILTER_ALL,
  SERVICE_STATE_ORDER,
  type ServiceStateFilter,
} from '../../constants/system-services'
import type { ServiceState, SystemServiceCounts } from '../../types/system-service'
import { ServiceStateSegment } from './ui/service-state-segment'

interface SystemServicesBannerProps {
  counts: SystemServiceCounts
  /** The list's current filter — the matching segment reads as selected. */
  state: ServiceStateFilter
  onStateChange: (value: ServiceStateFilter) => void
}

/**
 * The one question this page answers: how many schedulers are still on duty. The four
 * states are parts of one roster, so they share a single bar rather than four tiles —
 * and each part filters the list below it.
 */
export function SystemServicesBanner({
  counts,
  state,
  onStateChange,
}: SystemServicesBannerProps) {
  const stateCounts: Record<ServiceState, number> = {
    running: counts.running,
    scheduled: counts.scheduled,
    paused: counts.paused,
    failing: counts.failing,
  }

  // Running and scheduled are both "on duty" — a job mid-run has not left its post.
  const onDuty = counts.running + counts.scheduled
  const share = (value: number) => (counts.total > 0 ? value / counts.total : 0)

  const toggle = (next: ServiceState) =>
    onStateChange(state === next ? SERVICE_STATE_FILTER_ALL : next)

  return (
    <TooltipProvider>
      <Card size="sm" className="mb-4 shrink-0 shadow-sm">
        <CardContent className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="flex items-center gap-3 lg:w-56 lg:shrink-0">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--cares-tag-system-bg)] text-[var(--cares-tag-system-text)]">
              <ServerCog className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] tracking-wider text-gray-500 uppercase">
                On duty 24/7
              </p>
              <p className="flex items-baseline gap-1.5">
                <span className="text-2xl leading-tight font-semibold text-gray-900 tabular-nums">
                  {onDuty}
                </span>
                <span className="text-[13px] text-gray-400 tabular-nums">
                  of {counts.total} schedulers
                </span>
              </p>
            </div>
          </div>

          <div className="hidden w-px self-stretch bg-gray-100 lg:block" />

          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-gray-100">
              {SERVICE_STATE_ORDER.map((one) => (
                <div
                  key={one}
                  className={cn(
                    'h-full rounded-full transition-[width] duration-500',
                    SERVICE_STATE_BAR_STYLES[one],
                    state !== SERVICE_STATE_FILTER_ALL && state !== one && 'opacity-30',
                  )}
                  style={{ width: `${share(stateCounts[one]) * 100}%` }}
                />
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-1 sm:flex-nowrap">
              {SERVICE_STATE_ORDER.map((one) => (
                <ServiceStateSegment
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
