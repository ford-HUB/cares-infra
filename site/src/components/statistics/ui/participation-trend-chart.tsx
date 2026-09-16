import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import {
  STATISTICS_CHART_HEIGHT,
  STATISTICS_CURSOR_STROKE,
  STATISTICS_GRID_STROKE,
  STATISTICS_SERIES_COLOR,
} from '../../../constants/department-statistics'
import { formatNumber, formatPercent } from '../../../constants/formatting'
import type { MonthlyActivity } from '../../../types/department-statistics'
import { ChartCard, ChartFigure } from './chart-card'

interface ParticipationTrendChartProps {
  monthly: MonthlyActivity[]
}

const SERIES_ORDER = ['registrations', 'attended']
const legendOrder = (item: { dataKey?: unknown }) =>
  SERIES_ORDER.indexOf(String(item.dataKey))

const config: ChartConfig = {
  registrations: { label: 'Registered', color: STATISTICS_SERIES_COLOR.registrations },
  attended: { label: 'Attended', color: STATISTICS_SERIES_COLOR.attended },
}

/**
 * Registrations against completed attendance, month by month. The gap between the
 * two lines is the no-show rate — the thing a coordinator can actually act on.
 */
export function ParticipationTrendChart({ monthly }: ParticipationTrendChartProps) {
  const registrations = monthly.reduce((sum, row) => sum + row.registrations, 0)
  const attended = monthly.reduce((sum, row) => sum + row.attended, 0)

  return (
    <ChartCard
      title="Volunteer participation"
      description="Volunteers who registered for department events, and how many completed attendance."
      aside={
        <ChartFigure
          value={formatPercent(registrations > 0 ? attended / registrations : 0)}
          label="turned up overall"
        />
      }
    >
      <ChartContainer config={config} className={`w-full ${STATISTICS_CHART_HEIGHT}`}>
        <LineChart data={monthly} margin={{ left: 4, right: 12, top: 8 }}>
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
              <ChartTooltipContent formatter={(value) => formatNumber(Number(value))} />
            }
          />
          <ChartLegend itemSorter={legendOrder} content={<ChartLegendContent />} />
          <Line
            isAnimationActive={false}
            type="monotone"
            dataKey="registrations"
            stroke="var(--color-registrations)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 6, strokeWidth: 2, stroke: '#ffffff' }}
          />
          <Line
            isAnimationActive={false}
            type="monotone"
            dataKey="attended"
            stroke="var(--color-attended)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 6, strokeWidth: 2, stroke: '#ffffff' }}
          />
        </LineChart>
      </ChartContainer>
    </ChartCard>
  )
}
