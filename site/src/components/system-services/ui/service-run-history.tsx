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
  /** Runtime cap in seconds; a full-height tick spent its whole window. */
  capSeconds: number
}

/** So a two-second run still reads as a run, not a gap. */
const MIN_TICK_SHARE = 0.18

/** Colour is the outcome, height the share of the runtime cap spent. */
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
