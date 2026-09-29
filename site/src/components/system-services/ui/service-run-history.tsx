import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { formatTimeOfDay } from '../../../constants/formatting'
import {
  SERVICE_RUN_LABELS,
  SERVICE_RUN_STYLES,
  formatRuntime,
} from '../../../constants/system-services'
import type { ServiceRun } from '../../../types/system-service'

interface ServiceRunHistoryProps {
  runs: ServiceRun[]
  /** Runtime cap in seconds — a tick that reaches the top spent its whole window. */
  capSeconds: number
}

/** Minimum tick height, so a two-second run still reads as a run and not a gap. */
const MIN_TICK_SHARE = 0.18

/**
 * The last dozen runs as a strip of ticks: colour is the outcome, height is how much
 * of the runtime cap the run spent. A job creeping toward its cap is visible here
 * before it starts timing out.
 */
export function ServiceRunHistory({ runs, capSeconds }: ServiceRunHistoryProps) {
  return (
    <div className="flex h-8 items-end gap-[3px]" aria-hidden={false}>
      {runs.map((run) => {
        const share = capSeconds > 0 ? run.durationSeconds / capSeconds : 0
        const height = Math.min(1, Math.max(MIN_TICK_SHARE, share))

        return (
          <Tooltip key={run.id}>
            <TooltipTrigger asChild>
              <button
                type="button"
                tabIndex={-1}
                className="flex h-full w-1.5 shrink-0 cursor-default items-end"
              >
                <span
                  className={cn('w-full rounded-sm', SERVICE_RUN_STYLES[run.outcome])}
                  style={{ height: `${height * 100}%` }}
                />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">
              {SERVICE_RUN_LABELS[run.outcome]} · {formatRuntime(run.durationSeconds)} ·{' '}
              {formatTimeOfDay(run.startedAt)}
            </TooltipContent>
          </Tooltip>
        )
      })}
    </div>
  )
}
