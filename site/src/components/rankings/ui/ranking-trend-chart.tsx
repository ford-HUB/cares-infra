import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { formatNumber } from '../../../constants/formatting'
import {
  RANKING_SERIES_COLOR,
  RANKING_SERIES_FALLBACK,
} from '../../../constants/ranking'
import type { RankingTrend } from '../../../types/ranking'

interface RankingTrendChartProps {
  trend: RankingTrend
  loading: boolean
}

const CHART_HEIGHT = 'h-64'

/** Recharts keys rows by field, so each standing gets a stable series key. */
const seriesKey = (rank: number) => `rank${rank}`

/**
 * The top three only, each line in its own podium colour, so the chart reads as the
 * same race the podium above it shows. Points are cumulative: the line pulling ahead
 * is the one that stayed active.
 */
export function RankingTrendChart({ trend, loading }: RankingTrendChartProps) {
  if (loading) {
    return (
      <div className="border-t border-gray-100 pt-5">
        <Skeleton aria-hidden className={`w-full rounded-lg ${CHART_HEIGHT}`} />
      </div>
    )
  }

  const config: ChartConfig = Object.fromEntries(
    trend.series.map((series) => [
      seriesKey(series.rank),
      {
        label: series.name,
        color: RANKING_SERIES_COLOR[series.rank] ?? RANKING_SERIES_FALLBACK,
      },
    ]),
  )

  // One row per month, each standing a column — the shape Recharts charts read.
  const rows = trend.labels.map((label, index) => ({
    month: label,
    ...Object.fromEntries(
      trend.series.map((series) => [seriesKey(series.rank), series.values[index]]),
    ),
  }))

  return (
    <div className="border-t border-gray-100 pt-5">
      <p className="text-[11px] font-semibold tracking-wider text-gray-500 uppercase">
        Participation Race — Cumulative Points
      </p>

      <ChartContainer config={config} className={`mt-4 w-full ${CHART_HEIGHT}`}>
        <LineChart data={rows} margin={{ left: 4, right: 12, top: 8 }}>
          <CartesianGrid vertical={false} stroke="#f3f4f6" />
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            className="text-[11px]"
          />
          <YAxis
            width={48}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            className="text-[11px]"
            tickFormatter={(value: number) => formatNumber(value)}
          />
          {/* Shared crosshair readout, so the three standings compare at a glance. */}
          <ChartTooltip
            cursor={{ stroke: '#d1d5db', strokeDasharray: '4 4' }}
            content={
              <ChartTooltipContent
                formatter={(value) => `${formatNumber(Number(value))} pts`}
              />
            }
          />
          <ChartLegend content={<ChartLegendContent />} />

          {trend.series.map((series) => (
            <Line
              key={series.id}
              type="monotone"
              dataKey={seriesKey(series.rank)}
              stroke={`var(--color-${seriesKey(series.rank)})`}
              strokeWidth={2}
              // A surface ring keeps markers readable where the lines cross.
              dot={{ r: 4, strokeWidth: 2, stroke: '#ffffff' }}
              activeDot={{ r: 6, strokeWidth: 2, stroke: '#ffffff' }}
            />
          ))}
        </LineChart>
      </ChartContainer>
    </div>
  )
}
