import { Pause, Play, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  PERFORMANCE_RANGES,
  findPerformanceRange,
  type PerformanceRangeId,
} from '../../constants/system-performance'
import { formatTimeOfDay } from '../../constants/formatting'
import { LivePulse } from '../attendance/ui/live-pulse'

interface PerformanceToolbarProps {
  range: PerformanceRangeId
  onRangeChange: (range: PerformanceRangeId) => void
  streaming: boolean
  onStreamingChange: (streaming: boolean) => void
  /** Timestamp of the newest reading on screen. */
  capturedAt: string
  onRefresh: () => void
}

/**
 * The page's two controls: how far back it looks, and whether it keeps moving. Pausing
 * matters more than it looks — reading a row is impossible while the stream shifts it
 * every three seconds.
 */
export function PerformanceToolbar({
  range,
  onRangeChange,
  streaming,
  onStreamingChange,
  capturedAt,
  onRefresh,
}: PerformanceToolbarProps) {
  const streamable = findPerformanceRange(range).streaming

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-[12px] text-gray-500 tabular-nums">
        {streaming && streamable ? (
          <span className="flex items-center gap-1.5">
            <LivePulse colorClass="bg-red-500" animate />
            Live · {formatTimeOfDay(capturedAt)}
          </span>
        ) : (
          `Snapshot · ${formatTimeOfDay(capturedAt)}`
        )}
      </span>

      <ToggleGroup
        type="single"
        value={range}
        onValueChange={(value) => value && onRangeChange(value as PerformanceRangeId)}
        variant="outline"
        size="sm"
        aria-label="Charted window"
      >
        {PERFORMANCE_RANGES.map((one) => (
          <ToggleGroupItem key={one.id} value={one.id}>
            {one.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      {streamable ? (
        <Button
          variant="outline"
          size="sm"
          className="h-9"
          onClick={() => onStreamingChange(!streaming)}
          aria-pressed={streaming}
        >
          {streaming ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          {streaming ? 'Pause' : 'Resume'}
        </Button>
      ) : (
        <Button variant="outline" size="sm" className="h-9" onClick={onRefresh}>
          <RotateCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      )}
    </div>
  )
}
