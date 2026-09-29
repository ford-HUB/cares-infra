import { Cell, Pie, PieChart } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { OVERVIEW_DONUT_HEIGHT, OVERVIEW_EMPTY_FILL } from '../../../constants/overview'
import { formatNumber } from '../../../constants/formatting'
import { ChartCard } from '../../statistics/ui/chart-card'
import { OverviewLegend } from './overview-legend'
import { sumSlices, type OverviewSlice } from './overview-slice'

interface CompositionDonutProps {
  title: string
  description: string
  slices: OverviewSlice[]
  /** What the ring's centre number counts, e.g. "total accounts". */
  centreLabel: string
}

/**
 * A whole and its parts: the ring is the total, each arc is one segment, and the centre
 * holds the number the reader came for. A zero total still draws — as an empty track —
 * so the card never collapses on a fresh install.
 */
export function CompositionDonut({
  title,
  description,
  slices,
  centreLabel,
}: CompositionDonutProps) {
  const total = sumSlices(slices)
  const config: ChartConfig = Object.fromEntries(
    slices.map((slice) => [slice.key, { label: slice.label, color: slice.color }]),
  )
  const rows =
    total > 0 ? slices : [{ key: 'empty', label: 'No data', value: 1, color: OVERVIEW_EMPTY_FILL }]

  return (
    <ChartCard title={title} description={description}>
      <div className="relative">
        <ChartContainer config={config} className={`w-full ${OVERVIEW_DONUT_HEIGHT}`}>
          <PieChart>
            {total > 0 && (
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    nameKey="key"
                    hideLabel
                    formatter={(value) => formatNumber(Number(value))}
                  />
                }
              />
            )}
            <Pie
              data={rows}
              dataKey="value"
              nameKey="key"
              innerRadius="64%"
              outerRadius="92%"
              paddingAngle={total > 0 ? 1 : 0}
              stroke="#ffffff"
              strokeWidth={1}
              isAnimationActive={false}
            >
              {rows.map((row) => (
                <Cell key={row.key} fill={row.color} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-2xl leading-tight font-semibold text-gray-900 tabular-nums">
            {formatNumber(total)}
          </p>
          <p className="text-[11px] tracking-wider text-gray-500 uppercase">
            {centreLabel}
          </p>
        </div>
      </div>
      <OverviewLegend slices={slices} total={total} />
    </ChartCard>
  )
}
