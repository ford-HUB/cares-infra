import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import {
  STATISTICS_CHART_HEIGHT,
  STATISTICS_GRID_STROKE,
  STATISTICS_SERIES_COLOR,
} from '../../../constants/department-statistics'
import { formatNumber } from '../../../constants/formatting'
import type { MonthlyActivity } from '../../../types/department-statistics'
import { ChartCard, ChartFigure } from './chart-card'

interface EventsPerMonthChartProps {
  monthly: MonthlyActivity[]
}

const config: ChartConfig = {
  eventsHeld: { label: 'Events held', color: STATISTICS_SERIES_COLOR.single },
}

/** How many events the department ran each month — one series, so one hue and direct labels. */
export function EventsPerMonthChart({ monthly }: EventsPerMonthChartProps) {
  const total = monthly.reduce((sum, row) => sum + row.eventsHeld, 0)
  const perMonth = monthly.length > 0 ? total / monthly.length : 0

  return (
    <ChartCard
      title="Events held"
      description="Department events that ran in each month of the period."
      aside={<ChartFigure value={perMonth.toFixed(1)} label="per month on average" />}
    >
      <ChartContainer config={config} className={`w-full ${STATISTICS_CHART_HEIGHT}`}>
        <BarChart
          data={monthly}
          margin={{ left: 4, right: 12, top: 16 }}
          barCategoryGap="30%"
        >
          <CartesianGrid vertical={false} stroke={STATISTICS_GRID_STROKE} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            className="text-[11px]"
          />
          <YAxis
            width={32}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            allowDecimals={false}
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
            dataKey="eventsHeld"
            fill="var(--color-eventsHeld)"
            radius={[4, 4, 0, 0]}
          >
            <LabelList
              dataKey="eventsHeld"
              position="top"
              className="fill-gray-500 text-[11px]"
            />
          </Bar>
        </BarChart>
      </ChartContainer>
    </ChartCard>
  )
}
