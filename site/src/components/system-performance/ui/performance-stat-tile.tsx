import type { LucideIcon } from 'lucide-react'
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { HEALTH_TEXT_STYLES } from '../../../constants/system-performance'
import type { HealthState } from '../../../types/system-performance'
import { MetricSparkline } from './metric-sparkline'

interface PerformanceStatTileProps {
  label: string
  value: string
  /** The denominator or unit — a reading without one is not comparable. */
  meta: string
  icon: LucideIcon
  /** Tints the value only; the tile's chrome stays neutral. */
  health?: HealthState
  /** Change across the charted window, as a signed ratio. */
  delta: number
  /** True when a rise is bad — response time rising is not the same news as traffic. */
  riseIsBad?: boolean
  history: number[]
  sparkColor: string
}

/**
 * One independent metric. These do not sum to anything, so they sit as separate tiles
 * — unlike the CPU bands above, which are parts of one capacity and share a bar.
 */
export function PerformanceStatTile({
  label,
  value,
  meta,
  icon: Icon,
  health = 'healthy',
  delta,
  riseIsBad = false,
  history,
  sparkColor,
}: PerformanceStatTileProps) {
  // Under 2% is noise on a stream this jumpy; calling it a trend would be a lie.
  const flat = Math.abs(delta) < 0.02
  const bad = riseIsBad ? delta > 0 : delta < 0
  const DeltaIcon = flat ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight

  return (
    <Card size="sm" className="shadow-sm">
      <CardContent className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-gray-500">
              <Icon className="h-4 w-4" />
            </span>
            <span className="truncate text-[11px] tracking-wider text-gray-500 uppercase">
              {label}
            </span>
          </span>
          <span
            className={cn(
              'flex shrink-0 items-center gap-0.5 text-[12px] tabular-nums',
              flat ? 'text-gray-400' : bad ? 'text-amber-700' : 'text-emerald-700',
            )}
          >
            <DeltaIcon className="h-3.5 w-3.5" />
            {flat ? 'steady' : `${Math.abs(Math.round(delta * 100))}%`}
          </span>
        </div>

        <p className="flex items-baseline gap-1.5">
          <span
            className={cn(
              'text-2xl leading-tight font-semibold tabular-nums',
              HEALTH_TEXT_STYLES[health],
            )}
          >
            {value}
          </span>
          <span className="truncate text-[12px] text-gray-400 tabular-nums">{meta}</span>
        </p>

        <MetricSparkline
          values={history}
          color={sparkColor}
          label={`${label} over the charted window`}
        />
      </CardContent>
    </Card>
  )
}
