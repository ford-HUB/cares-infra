import { PolarAngleAxis, RadialBar, RadialBarChart } from 'recharts'
import { ChartContainer, type ChartConfig } from '@/components/ui/chart'
import { OVERVIEW_EMPTY_FILL, OVERVIEW_GAUGE_HEIGHT } from '../../../constants/overview'
import { formatNumber } from '../../../constants/formatting'
import { ChartCard } from '../../statistics/ui/chart-card'

interface RateGaugeProps {
  title: string
  description: string
  /** The part; always shown against `total` so the arc has a denominator in words too. */
  value: number
  total: number
  /** What the pair counts, e.g. "volunteers verified". */
  caption: string
  color: string
}

/**
 * One ratio as an arc. The percentage is the headline, the `x of y` under it keeps the
 * raw counts on screen — a rate off a total of three should not read like a trend.
 */
export function RateGauge({
  title,
  description,
  value,
  total,
  caption,
  color,
}: RateGaugeProps) {
  const ratio = total > 0 ? Math.min(value / total, 1) : 0
  const config: ChartConfig = { rate: { label: title, color } }

  return (
    <ChartCard title={title} description={description}>
      <div className="relative">
        <ChartContainer config={config} className={`w-full ${OVERVIEW_GAUGE_HEIGHT}`}>
          <RadialBarChart
            data={[{ name: 'rate', rate: ratio * 100 }]}
            startAngle={90}
            endAngle={-270}
            innerRadius="72%"
            outerRadius="100%"
          >
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} axisLine={false} />
            <RadialBar
              dataKey="rate"
              fill={color}
              cornerRadius={9}
              background={{ fill: OVERVIEW_EMPTY_FILL }}
              isAnimationActive={false}
            />
          </RadialBarChart>
        </ChartContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-2xl leading-tight font-semibold text-gray-900 tabular-nums">
            {(ratio * 100).toFixed(1)}%
          </p>
          <p className="text-[11px] text-gray-400 tabular-nums">
            {formatNumber(value)} of {formatNumber(total)}
          </p>
        </div>
      </div>
      <p className="text-center text-[12px] text-gray-500">{caption}</p>
    </ChartCard>
  )
}
