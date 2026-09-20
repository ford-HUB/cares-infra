import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { ChartCard, ChartFigure } from '../../statistics/ui/chart-card'
import {
  NEED_CATEGORY_LABELS,
  NEED_CATEGORY_ORDER,
  NEED_SCORE_MAX,
  NEEDS_GRID_STROKE,
  NEEDS_SERIES_COLOR,
  NEEDS_SMALL_CHART_HEIGHT,
} from '../../../constants/residential-needs'
import type { Household } from '../../../types/residential-needs'

interface NeedsByCategoryChartProps {
  households: Household[]
}

const config: ChartConfig = {
  score: { label: 'Average score', color: NEEDS_SERIES_COLOR },
}

/** Which need is felt most across the surveyed households — the average 0–5 score per category. */
export function NeedsByCategoryChart({ households }: NeedsByCategoryChartProps) {
  const rows = NEED_CATEGORY_ORDER.map((category) => ({
    category: NEED_CATEGORY_LABELS[category],
    score:
      households.length > 0
        ? Number(
            (
              households.reduce((sum, h) => sum + h.needs[category], 0) / households.length
            ).toFixed(1),
          )
        : 0,
  })).sort((a, b) => b.score - a.score)
  const leader = rows[0]

  return (
    <ChartCard
      title="Needs by category"
      description={`Average survey score per need, out of ${NEED_SCORE_MAX}.`}
      aside={leader && <ChartFigure value={leader.category} label="most pressing" />}
    >
      <ChartContainer config={config} className={`w-full ${NEEDS_SMALL_CHART_HEIGHT}`}>
        <BarChart
          data={rows}
          layout="vertical"
          margin={{ left: 4, right: 28 }}
          barCategoryGap="30%"
        >
          <CartesianGrid horizontal={false} stroke={NEEDS_GRID_STROKE} />
          <XAxis type="number" hide domain={[0, NEED_SCORE_MAX]} />
          <YAxis
            type="category"
            dataKey="category"
            width={96}
            tickLine={false}
            axisLine={false}
            className="text-[11px]"
          />
          <ChartTooltip
            cursor={{ fill: NEEDS_GRID_STROKE }}
            content={<ChartTooltipContent formatter={(value) => `${value} / ${NEED_SCORE_MAX}`} />}
          />
          <Bar
            isAnimationActive={false}
            dataKey="score"
            fill="var(--color-score)"
            radius={[0, 4, 4, 0]}
          >
            <LabelList dataKey="score" position="right" className="fill-gray-500 text-[11px]" />
          </Bar>
        </BarChart>
      </ChartContainer>
    </ChartCard>
  )
}
