import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { ChartCard, ChartFigure } from '../../statistics/ui/chart-card'
import { formatNumber, formatPercent } from '../../../constants/formatting'
import {
  NEEDS_GRID_STROKE,
  NEEDS_SERIES_COLOR,
  NEEDS_SMALL_CHART_HEIGHT,
} from '../../../constants/residential-needs'

export interface SurveyAnswerRow {
  label: string
  count: number
}

interface SurveyAnswerChartProps {
  title: string
  description: string
  /** One row per answer choice, in survey order; the chart sorts them by count. */
  rows: SurveyAnswerRow[]
  /** Households the counts are out of — the share shown beside the leader. */
  total: number
}

const config: ChartConfig = {
  count: { label: 'Households', color: NEEDS_SERIES_COLOR },
}

/**
 * How many households picked each answer to one survey question — the shape used
 * for the needs (Q1), difficulties (Q3) and community problems (Q4) charts.
 */
export function SurveyAnswerChart({ title, description, rows, total }: SurveyAnswerChartProps) {
  const sorted = [...rows].sort((a, b) => b.count - a.count)
  const leader = sorted[0]

  return (
    <ChartCard
      title={title}
      description={description}
      aside={
        leader &&
        leader.count > 0 && (
          <ChartFigure
            value={leader.label}
            label={`${formatPercent(total > 0 ? leader.count / total : 0)} of households`}
          />
        )
      }
    >
      <ChartContainer config={config} className={`w-full ${NEEDS_SMALL_CHART_HEIGHT}`}>
        <BarChart
          data={sorted}
          layout="vertical"
          margin={{ left: 4, right: 28 }}
          barCategoryGap="30%"
        >
          <CartesianGrid horizontal={false} stroke={NEEDS_GRID_STROKE} />
          <XAxis type="number" hide domain={[0, Math.max(total, 1)]} allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="label"
            width={120}
            tickLine={false}
            axisLine={false}
            className="text-[11px]"
          />
          <ChartTooltip
            cursor={{ fill: NEEDS_GRID_STROKE }}
            content={
              <ChartTooltipContent
                formatter={(value) => `${formatNumber(Number(value))} of ${formatNumber(total)}`}
              />
            }
          />
          <Bar
            isAnimationActive={false}
            dataKey="count"
            fill="var(--color-count)"
            radius={[0, 4, 4, 0]}
          >
            <LabelList dataKey="count" position="right" className="fill-gray-500 text-[11px]" />
          </Bar>
        </BarChart>
      </ChartContainer>
    </ChartCard>
  )
}
