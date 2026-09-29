import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import {
  STATISTICS_GRID_STROKE,
  STATISTICS_SERIES_COLOR,
  STATISTICS_SMALL_CHART_HEIGHT,
} from '../../../constants/department-statistics'
import { formatNumber } from '../../../constants/formatting'
import type { CategoryActivity } from '../../../types/department-statistics'
import { ChartCard, ChartFigure } from './chart-card'

interface EventsByCategoryChartProps {
  categories: CategoryActivity[]
}

const config: ChartConfig = {
  events: { label: 'Events', color: STATISTICS_SERIES_COLOR.single },
}

/** Which kinds of events the department runs — sorted so the biggest reads first. */
export function EventsByCategoryChart({ categories }: EventsByCategoryChartProps) {
  const rows = [...categories].sort((a, b) => b.events - a.events)
  const leader = rows[0]

  return (
    <ChartCard
      title="Events by category"
      description="Where the department's event effort goes."
      aside={leader && <ChartFigure value={leader.category} label="most frequent" />}
    >
      <ChartContainer
        config={config}
        className={`w-full ${STATISTICS_SMALL_CHART_HEIGHT}`}
      >
        <BarChart
          data={rows}
          layout="vertical"
          margin={{ left: 4, right: 28 }}
          barCategoryGap="30%"
        >
          <CartesianGrid horizontal={false} stroke={STATISTICS_GRID_STROKE} />
          <XAxis type="number" hide allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="category"
            width={88}
            tickLine={false}
            axisLine={false}
            className="text-[11px]"
          />
          <ChartTooltip
            cursor={{ fill: STATISTICS_GRID_STROKE }}
            content={
              <ChartTooltipContent formatter={(value) => formatNumber(Number(value))} />
            }
          />
          <Bar
            isAnimationActive={false}
            dataKey="events"
            fill="var(--color-events)"
            radius={[0, 4, 4, 0]}
          >
            <LabelList
              dataKey="events"
              position="right"
              className="fill-gray-500 text-[11px]"
            />
          </Bar>
        </BarChart>
      </ChartContainer>
    </ChartCard>
  )
}
