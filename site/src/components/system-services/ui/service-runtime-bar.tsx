import { cn } from '@/lib/utils'
import { formatRuntime } from '../../../constants/system-services'

interface ServiceRuntimeBarProps {
  /** Seconds the run being described has spent — elapsed if it is still going. */
  spentSeconds: number
  averageSeconds: number
  capSeconds: number
  running: boolean
}

/**
 * How much of its runtime window a run is using. The cap is the whole bar, the median
 * run is a tick on it — so a run drifting toward the kill line reads as drift, not as
 * a number staff have to compare against a setting elsewhere on the row.
 */
export function ServiceRuntimeBar({
  spentSeconds,
  averageSeconds,
  capSeconds,
  running,
}: ServiceRuntimeBarProps) {
  const share = capSeconds > 0 ? Math.min(1, spentSeconds / capSeconds) : 0
  const averageShare = capSeconds > 0 ? Math.min(1, averageSeconds / capSeconds) : 0
  const nearCap = share >= 0.8

  return (
    <div className="min-w-0 space-y-1">
      <div className="relative h-1.5 overflow-hidden rounded-full bg-gray-100">
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-700',
            nearCap ? 'bg-amber-500' : running ? 'bg-emerald-500' : 'bg-emerald-300',
          )}
          style={{ width: `${share * 100}%` }}
        />
        <span
          aria-hidden
          className="absolute inset-y-0 w-px bg-gray-400"
          style={{ left: `${averageShare * 100}%` }}
        />
      </div>
      <p className="text-[11px] text-gray-400 tabular-nums">
        {running ? 'running ' : 'last '}
        <span className={cn('font-medium', nearCap ? 'text-amber-700' : 'text-gray-600')}>
          {formatRuntime(spentSeconds)}
        </span>{' '}
        · median {formatRuntime(averageSeconds)} · cap {formatRuntime(capSeconds)}
      </p>
    </div>
  )
}
