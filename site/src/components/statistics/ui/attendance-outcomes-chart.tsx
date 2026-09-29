import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import {
  ATTENDANCE_OUTCOME_COLOR,
  ATTENDANCE_OUTCOME_LABELS,
  ATTENDANCE_OUTCOME_ORDER,
  STATISTICS_GRID_STROKE,
  STATISTICS_SMALL_CHART_HEIGHT,
} from '../../../constants/department-statistics'
import { formatNumber } from '../../../constants/formatting'
import type {
  AttendanceOutcome,
  CategoryActivity,
} from '../../../types/department-statistics'
import { ChartCard } from './chart-card'

interface AttendanceOutcomesChartProps {
  categories: CategoryActivity[]
}

const legendOrder = (item: { dataKey?: unknown }) =>
  ATTENDANCE_OUTCOME_ORDER.indexOf(String(item.dataKey) as AttendanceOutcome)

const config: ChartConfig = Object.fromEntries(
  ATTENDANCE_OUTCOME_ORDER.map((outcome) => [
    outcome,
    {
      label: ATTENDANCE_OUTCOME_LABELS[outcome],
      color: ATTENDANCE_OUTCOME_COLOR[outcome],
    },
  ]),
)

/**
 * Where registrations ended up, per event category, as horizontal stacks — each bar
 * is one category's whole, so a category that draws sign-ups but not attendance
 * shows as a long bar with a short green start.
 */
export function AttendanceOutcomesChart({ categories }: AttendanceOutcomesChartProps) {
  const rows = categories.map((row) => ({ category: row.category, ...row.outcomes }))

  return (
    <ChartCard
      title="Attendance outcomes"
      description="How registrations resolved, by event category."
    >
      <ChartContainer
        config={config}
        className={`w-full ${STATISTICS_SMALL_CHART_HEIGHT}`}
      >
        <BarChart
          data={rows}
          layout="vertical"
          margin={{ left: 4, right: 12 }}
          barCategoryGap="30%"
        >
          <CartesianGrid horizontal={false} stroke={STATISTICS_GRID_STROKE} />
          <XAxis
            type="number"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            className="text-[11px]"
            tickFormatter={(value: number) => formatNumber(value)}
          />
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
          <ChartLegend itemSorter={legendOrder} content={<ChartLegendContent />} />
          {ATTENDANCE_OUTCOME_ORDER.map((outcome, index) => (
            <Bar
              isAnimationActive={false}
              key={outcome}
              dataKey={outcome}
              stackId="outcome"
              fill={`var(--color-${outcome})`}
              // A hairline of surface between stacked segments keeps them separable.
              stroke="#ffffff"
              strokeWidth={1}
              radius={index === ATTENDANCE_OUTCOME_ORDER.length - 1 ? [0, 4, 4, 0] : 0}
            />
          ))}
        </BarChart>
      </ChartContainer>
    </ChartCard>
  )
}
