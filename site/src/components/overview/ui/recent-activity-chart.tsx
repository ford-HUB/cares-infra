import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { STATISTICS_GRID_STROKE } from '../../../constants/department-statistics'
import { OVERVIEW_BAR_HEIGHT } from '../../../constants/overview'
import { formatNumber } from '../../../constants/formatting'
import { ChartCard, ChartFigure } from '../../statistics/ui/chart-card'

export interface RecentActivityRow {
  label: string
  value: number
}

interface RecentActivityChartProps {
  rows: RecentActivityRow[]
  /** How far back the window reaches, in days — the server decides, the copy repeats it. */
  recentDays: number
}

const config: ChartConfig = { value: { label: 'In window', color: '#2a78d6' } }

/**
 * What moved inside the recent window, one bar per kind. A single hue, because these
 * are one measure — activity in the window — counted over different things.
 */
export function RecentActivityChart({ rows, recentDays }: RecentActivityChartProps) {
  const total = rows.reduce((sum, row) => sum + row.value, 0)

  return (
    <ChartCard
      title={`Recent activity (last ${recentDays} days)`}
      description="Everything the system recorded inside the window, side by side."
      aside={<ChartFigure value={formatNumber(total)} label="records in window" />}
    >
      <ChartContainer config={config} className={`w-full ${OVERVIEW_BAR_HEIGHT}`}>
        <BarChart data={rows} margin={{ left: 4, right: 12, top: 16 }} barCategoryGap="30%">
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
              <ChartTooltipContent
                hideLabel={false}
                formatter={(value) => formatNumber(Number(value))}
              />
            }
          />
          <Bar
            isAnimationActive={false}
            dataKey="value"
            fill="var(--color-value)"
            radius={[4, 4, 0, 0]}
          >
            <LabelList
              dataKey="value"
              position="top"
              className="fill-gray-500 text-[11px]"
            />
          </Bar>
        </BarChart>
      </ChartContainer>
    </ChartCard>
  )
}
