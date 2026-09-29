import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from 'lucide-react'
import { Line, LineChart } from 'recharts'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { STATISTICS_SERIES_COLOR } from '../../../constants/department-statistics'
import type { StatisticSummary } from '../../../types/department-statistics'

interface StatisticTileProps {
  icon: LucideIcon
  /** Icon chip tint — `bg-{tone}-50 text-{tone}-600`. */
  chipClass: string
  label: string
  summary: StatisticSummary
  /** Renders the value; a rate passes a percent formatter, a count a number one. */
  format: (value: number) => string
  /** What the number is compared against, e.g. "vs previous 6 months". */
  comparison: string
}

/**
 * One headline number: the value, its movement against the previous period, and the
 * per-month trend as a sparkline behind it. The delta is text plus an arrow so the
 * direction never rides on colour alone.
 */
export function StatisticTile({
  icon: Icon,
  chipClass,
  label,
  summary,
  format,
  comparison,
}: StatisticTileProps) {
  const delta =
    summary.previous !== null && summary.previous > 0
      ? ((summary.value - summary.previous) / summary.previous) * 100
      : null
  const direction =
    delta === null || Math.abs(delta) < 0.05 ? 'flat' : delta > 0 ? 'up' : 'down'
  const DeltaIcon =
    direction === 'up' ? ArrowUpRight : direction === 'down' ? ArrowDownRight : Minus

  const points = summary.trend.map((value, index) => ({ index, value }))

  return (
    <Card size="sm" className="min-w-0 shadow-sm">
      <CardContent className="flex items-start gap-3">
        <span
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
            chipClass,
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] tracking-wider text-gray-500 uppercase">{label}</p>
          <p className="text-2xl leading-tight font-semibold text-gray-900 tabular-nums">
            {format(summary.value)}
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-gray-400">
            <span
              className={cn(
                'flex items-center gap-0.5 font-medium tabular-nums',
                direction === 'up' && 'text-emerald-600',
                direction === 'down' && 'text-amber-600',
                direction === 'flat' && 'text-gray-500',
              )}
            >
              <DeltaIcon className="h-3 w-3" />
              {delta === null ? 'n/a' : `${Math.abs(delta).toFixed(1)}%`}
            </span>
            <span className="truncate">{comparison}</span>
          </p>
        </div>
        {points.length > 1 && (
          <div className="h-10 w-20 shrink-0 self-center" aria-hidden>
            <LineChart
              width={80}
              height={40}
              data={points}
              margin={{ top: 4, bottom: 4 }}
            >
              <Line
                type="monotone"
                dataKey="value"
                stroke={STATISTICS_SERIES_COLOR.single}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
