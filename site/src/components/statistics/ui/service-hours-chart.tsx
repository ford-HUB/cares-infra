import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import {
  STATISTICS_CURSOR_STROKE,
  STATISTICS_GRID_STROKE,
  STATISTICS_SERIES_COLOR,
  STATISTICS_SMALL_CHART_HEIGHT,
} from '../../../constants/department-statistics'
import { formatNumber } from '../../../constants/formatting'
import type { MonthlyActivity } from '../../../types/department-statistics'
import { ChartCard, ChartFigure } from './chart-card'

interface ServiceHoursChartProps {
  monthly: MonthlyActivity[]
}

const config: ChartConfig = {
  serviceHours: { label: 'Service hours', color: STATISTICS_SERIES_COLOR.single },
}

/** Credited volunteer hours per month — a single series, so an area reads best. */
export function ServiceHoursChart({ monthly }: ServiceHoursChartProps) {
  const total = monthly.reduce((sum, row) => sum + row.serviceHours, 0)

  return (
    <ChartCard
      title="Service hours"
      description="Hours credited to department volunteers for completed attendance."
      aside={<ChartFigure value={formatNumber(total)} label="hours this period" />}
    >
      <ChartContainer
        config={config}
        className={`w-full ${STATISTICS_SMALL_CHART_HEIGHT}`}
      >
        <AreaChart data={monthly} margin={{ left: 4, right: 12, top: 8 }}>
          <defs>
            <linearGradient id="serviceHoursFill" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor="var(--color-serviceHours)"
                stopOpacity={0.25}
              />
              <stop
                offset="100%"
                stopColor="var(--color-serviceHours)"
                stopOpacity={0.02}
              />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={STATISTICS_GRID_STROKE} />
          <XAxis
            dataKey="label"
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
          <ChartTooltip
            cursor={{ stroke: STATISTICS_CURSOR_STROKE, strokeDasharray: '4 4' }}
            content={
              <ChartTooltipContent
                formatter={(value) => `${formatNumber(Number(value))} h`}
              />
            }
          />
          <Area
            isAnimationActive={false}
            type="monotone"
            dataKey="serviceHours"
            stroke="var(--color-serviceHours)"
            strokeWidth={2}
            fill="url(#serviceHoursFill)"
            dot={false}
            activeDot={{ r: 5, strokeWidth: 2, stroke: '#ffffff' }}
          />
        </AreaChart>
      </ChartContainer>
    </ChartCard>
  )
}
