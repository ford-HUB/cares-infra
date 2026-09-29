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
  REPORT_OUTCOME_COLOR,
  REPORT_OUTCOME_LABELS,
  REPORT_OUTCOME_ORDER,
  STATISTICS_GRID_STROKE,
  STATISTICS_SMALL_CHART_HEIGHT,
} from '../../../constants/department-statistics'
import { formatNumber, formatPercent } from '../../../constants/formatting'
import type {
  MonthlyReportActivity,
  ReportOutcome,
} from '../../../types/department-statistics'
import { ChartCard, ChartFigure } from './chart-card'

interface ReportStatusChartProps {
  reports: MonthlyReportActivity[]
}

const legendOrder = (item: { dataKey?: unknown }) =>
  REPORT_OUTCOME_ORDER.indexOf(String(item.dataKey) as ReportOutcome)

const config: ChartConfig = Object.fromEntries(
  REPORT_OUTCOME_ORDER.map((outcome) => [
    outcome,
    { label: REPORT_OUTCOME_LABELS[outcome], color: REPORT_OUTCOME_COLOR[outcome] },
  ]),
)

/**
 * Where each month's report stands. One report per month is the norm, so the chart
 * reads as a strip of verdicts — a returned month is the amber gap in the green.
 */
export function ReportStatusChart({ reports }: ReportStatusChartProps) {
  const rows = reports.map((row) => ({ label: row.label, ...row.outcomes }))
  const submitted = reports.reduce(
    (sum, row) =>
      sum + row.outcomes.approved + row.outcomes.underReview + row.outcomes.returned,
    0,
  )
  const approved = reports.reduce((sum, row) => sum + row.outcomes.approved, 0)

  return (
    <ChartCard
      title="Monthly reports"
      description="The department's report for each month, by where it stands with the director."
      aside={
        <ChartFigure
          value={formatPercent(submitted > 0 ? approved / submitted : 0)}
          label="approved"
        />
      }
    >
      <ChartContainer
        config={config}
        className={`w-full ${STATISTICS_SMALL_CHART_HEIGHT}`}
      >
        <BarChart
          data={rows}
          margin={{ left: 4, right: 12, top: 8 }}
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
            width={24}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            className="text-[11px]"
          />
          <ChartTooltip
            cursor={{ fill: STATISTICS_GRID_STROKE }}
            content={
              <ChartTooltipContent formatter={(value) => formatNumber(Number(value))} />
            }
          />
          <ChartLegend itemSorter={legendOrder} content={<ChartLegendContent />} />
          {REPORT_OUTCOME_ORDER.map((outcome) => (
            <Bar
              isAnimationActive={false}
              key={outcome}
              dataKey={outcome}
              stackId="report"
              fill={`var(--color-${outcome})`}
              stroke="#ffffff"
              strokeWidth={1}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </BarChart>
      </ChartContainer>
    </ChartCard>
  )
}
