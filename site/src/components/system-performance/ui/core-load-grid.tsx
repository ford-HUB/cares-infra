import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  CPU_CRITICAL_PERCENT,
  CPU_STRAINED_PERCENT,
  cpuHealth,
} from '../../../constants/system-performance'
import type { CpuCore, HealthState } from '../../../types/system-performance'

interface CoreLoadGridProps {
  cores: CpuCore[]
}

/** The one place a reading is coloured by state — a pinned core is the alarm. */
const CORE_FILL: Record<HealthState, string> = {
  healthy: 'bg-emerald-500',
  strained: 'bg-amber-500',
  critical: 'bg-red-500',
}

/**
 * Per-core load as vertical meters. The host average hides the case that actually
 * hurts — one core pinned at 98 % while seven idle — so the cores are drawn
 * individually and the average is left to the banner.
 */
export function CoreLoadGrid({ cores }: CoreLoadGridProps) {
  return (
    <div>
      <p className="text-[11px] font-semibold tracking-wider text-gray-500 uppercase">
        Per-core load
      </p>

      <div className="mt-3 flex items-end gap-1.5">
        {cores.map((core) => {
          const health = cpuHealth(core.usagePercent)
          return (
            <Tooltip key={core.id}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="group flex min-w-0 flex-1 flex-col items-center gap-1.5 rounded-lg py-1 focus-visible:ring-2 focus-visible:ring-[var(--cares-primary)] focus-visible:outline-none"
                >
                  <span className="flex h-20 w-full items-end overflow-hidden rounded-md bg-gray-100">
                    <span
                      className={cn(
                        'w-full rounded-md transition-[height] duration-500',
                        CORE_FILL[health],
                      )}
                      style={{ height: `${core.usagePercent}%` }}
                    />
                  </span>
                  <span className="text-[10px] text-gray-400 tabular-nums">
                    {core.id}
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                Core {core.id} — {Math.round(core.usagePercent)}%, mostly{' '}
                {core.runningWhat.toLowerCase()}.
              </TooltipContent>
            </Tooltip>
          )
        })}
      </div>

      <p className="mt-2 text-[11px] text-gray-400">
        Amber from {CPU_STRAINED_PERCENT}%, red from {CPU_CRITICAL_PERCENT}% — hover a
        core for what it is running.
      </p>
    </div>
  )
}
