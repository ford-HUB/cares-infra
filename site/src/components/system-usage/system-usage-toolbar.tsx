import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LIVE_TICK_MS } from '../../constants/system-usage'
import type { LiveSourceState } from '../../types/system-usage'

interface SystemUsageToolbarProps {
  hostName?: string
  performanceSource: LiveSourceState
  refreshing: boolean
  onRefresh: () => void
}

/** Title, what is live, and a manual refresh — same shape as the programme toolbar. */
export function SystemUsageToolbar({
  hostName,
  performanceSource,
  refreshing,
  onRefresh,
}: SystemUsageToolbarProps) {
  const live = performanceSource.allowed && !performanceSource.error

  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl leading-7 font-bold tracking-tight text-gray-900">
          System Statistics
        </h1>
        <p className="mt-1 text-sm leading-5 text-gray-600">
          CPU usage per day, system load and service health
          {hostName ? ` on ${hostName}` : ''}.
        </p>
        <p className="mt-1 text-xs leading-4 text-gray-400">
          {live
            ? `Live · updates every ${LIVE_TICK_MS / 1000} s`
            : performanceSource.allowed
              ? `Live readings unavailable — ${performanceSource.error}`
              : 'Live readings need the “View system performance” right'}
        </p>
      </div>

      <Button type="button" variant="outline" size="sm" onClick={onRefresh} disabled={refreshing}>
        <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
        Refresh
      </Button>
    </div>
  )
}
