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
  STATISTICS_DEPARTMENT_AXIS_WIDTH,
  STATISTICS_DEPARTMENT_CHART_HEIGHT,
  STATISTICS_GRID_STROKE,
  STATISTICS_SERIES_COLOR,
} from '../../../constants/department-statistics'
import { formatNumber } from '../../../constants/formatting'
import type { DepartmentActivity } from '../../../types/department-statistics'
import { ChartCard, ChartFigure } from './chart-card'

interface DepartmentActivityChartProps {
  departments: DepartmentActivity[]
}

const SERIES_ORDER = ['registrations', 'attended']
const legendOrder = (item: { dataKey?: unknown }) =>
  SERIES_ORDER.indexOf(String(item.dataKey))

const config: ChartConfig = {
  registrations: { label: 'Registered', color: STATISTICS_SERIES_COLOR.registrations },
  attended: { label: 'Attended', color: STATISTICS_SERIES_COLOR.attended },
}

/**
 * The colleges side by side, sorted by attendance, registered beside attended so a
 * college that signs volunteers up but does not get them on site stands out. This
 * block only appears when the scope is every department.
 */
export function DepartmentActivityChart({ departments }: DepartmentActivityChartProps) {
  const rows = [...departments].sort((a, b) => b.attended - a.attended)
  const leader = rows[0]

  return (
    <ChartCard
      title="Activity by department"
      description="Registered and attended volunteers per college over the period."
      aside={leader && <ChartFigure value={leader.department} label="most attended" />}
    >
      <ChartContainer config={config} className={`w-full ${STATISTICS_DEPARTMENT_CHART_HEIGHT}`}>
        <BarChart
          data={rows}
          layout="vertical"
          margin={{ left: 4, right: 12 }}
          barCategoryGap="25%"
          barGap={2}
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
            dataKey="department"
            width={STATISTICS_DEPARTMENT_AXIS_WIDTH}
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
          <Bar
            isAnimationActive={false}
            dataKey="registrations"
            fill="var(--color-registrations)"
            radius={[0, 4, 4, 0]}
          />
          <Bar
            isAnimationActive={false}
            dataKey="attended"
            fill="var(--color-attended)"
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ChartContainer>
    </ChartCard>
  )
}
