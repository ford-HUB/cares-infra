import type { ReactNode } from 'react'
import { Bar, BarChart, XAxis, YAxis } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import {
  OVERVIEW_EMPTY_FILL,
  OVERVIEW_SEGMENT_HEIGHT,
} from '../../../constants/overview'
import { formatNumber } from '../../../constants/formatting'
import { ChartCard, ChartFigure } from '../../statistics/ui/chart-card'
import { OverviewLegend } from './overview-legend'
import { sumSlices, type OverviewSlice } from './overview-slice'

interface SegmentedTotalChartProps {
  title: string
  description: string
  slices: OverviewSlice[]
  /** The figure in the card's corner — the total, or the one rate that summarises it. */
  aside?: ReactNode
  footer?: ReactNode
}

/**
 * One bar that *is* the total, cut into its states. Reading it takes no arithmetic:
 * the widths are the shares, and the legend under it carries the counts.
 */
export function SegmentedTotalChart({
  title,
  description,
  slices,
  aside,
  footer,
}: SegmentedTotalChartProps) {
  const total = sumSlices(slices)
  const drawn =
    total > 0
      ? slices
      : [{ key: 'empty', label: 'No data', value: 1, color: OVERVIEW_EMPTY_FILL }]
  const config: ChartConfig = Object.fromEntries(
    drawn.map((slice) => [slice.key, { label: slice.label, color: slice.color }]),
  )
  const row = Object.fromEntries([
    ['name', 'total'],
    ...drawn.map((slice) => [slice.key, slice.value]),
  ])

  return (
    <ChartCard
      title={title}
      description={description}
      aside={aside ?? <ChartFigure value={formatNumber(total)} label="in total" />}
    >
      <ChartContainer config={config} className={`w-full ${OVERVIEW_SEGMENT_HEIGHT}`}>
        <BarChart data={[row]} layout="vertical" margin={{ top: 0, bottom: 0 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" hide />
          {total > 0 && (
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  hideLabel
                  formatter={(value) => formatNumber(Number(value))}
                />
              }
            />
          )}
          {drawn.map((slice, index) => (
            <Bar
              isAnimationActive={false}
              key={slice.key}
              dataKey={slice.key}
              stackId="total"
              fill={`var(--color-${slice.key})`}
              barSize={18}
              stroke="#ffffff"
              strokeWidth={1}
              radius={
                drawn.length === 1
                  ? 4
                  : index === 0
                    ? [4, 0, 0, 4]
                    : index === drawn.length - 1
                      ? [0, 4, 4, 0]
                      : 0
              }
            />
          ))}
        </BarChart>
      </ChartContainer>
      <OverviewLegend slices={slices} total={total} columns={1} />
      {footer}
    </ChartCard>
  )
}
