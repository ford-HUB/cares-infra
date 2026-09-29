import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { ChartCard, ChartFigure } from '../../statistics/ui/chart-card'
import { formatNumber } from '../../../constants/formatting'
import {
  NEED_PRIORITY_LABELS,
  NEED_PRIORITY_ORDER,
  NEEDS_GRID_STROKE,
  NEEDS_SMALL_CHART_HEIGHT,
} from '../../../constants/residential-needs'
import {
  householdPriority,
  RESIDENTIAL_NEEDS_BARANGAYS,
} from '../../../services/residential-needs-mock'
import type { Household, NeedPriority } from '../../../types/residential-needs'

interface NeedsByBarangayChartProps {
  households: Household[]
}

/** Priority hues as hex for the chart — the same four the badge and bar classes use. */
const PRIORITY_HEX: Record<NeedPriority, string> = {
  critical: '#ef4444',
  high: '#f59e0b',
  moderate: '#10b981',
  low: '#d1d5db',
}

const config: ChartConfig = Object.fromEntries(
  NEED_PRIORITY_ORDER.map((band) => [
    band,
    { label: NEED_PRIORITY_LABELS[band], color: PRIORITY_HEX[band] },
  ]),
)

const legendOrder = (item: { dataKey?: unknown }) =>
  NEED_PRIORITY_ORDER.indexOf(String(item.dataKey) as NeedPriority)

/**
 * Where the surveyed households live and how urgent each barangay's list is — one
 * stacked bar per barangay, so a place with many critical rows reads as a long red
 * start even when its total is small.
 */
export function NeedsByBarangayChart({ households }: NeedsByBarangayChartProps) {
  const rows = RESIDENTIAL_NEEDS_BARANGAYS.map((barangay) => {
    const counts = Object.fromEntries(NEED_PRIORITY_ORDER.map((band) => [band, 0])) as Record<
      NeedPriority,
      number
    >
    households
      .filter((h) => h.barangay === barangay)
      .forEach((h) => {
        counts[householdPriority(h)] += 1
      })
    return { barangay, ...counts, total: households.filter((h) => h.barangay === barangay).length }
  }).sort((a, b) => b.total - a.total)
  const leader = rows[0]

  return (
    <ChartCard
      title="Households by barangay"
      description="Surveyed households per barangay, split by priority."
      aside={
        leader && (
          <ChartFigure value={leader.barangay} label={`${formatNumber(leader.total)} households`} />
        )
      }
    >
      <ChartContainer config={config} className={`w-full ${NEEDS_SMALL_CHART_HEIGHT}`}>
        <BarChart data={rows} layout="vertical" margin={{ left: 4, right: 12 }} barCategoryGap="30%">
          <CartesianGrid horizontal={false} stroke={NEEDS_GRID_STROKE} />
          <XAxis type="number" hide allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="barangay"
            width={88}
            tickLine={false}
            axisLine={false}
            className="text-[11px]"
          />
          <ChartTooltip
            cursor={{ fill: NEEDS_GRID_STROKE }}
            content={<ChartTooltipContent formatter={(value) => formatNumber(Number(value))} />}
          />
          <ChartLegend content={<ChartLegendContent />} itemSorter={legendOrder} />
          {NEED_PRIORITY_ORDER.map((band, i) => (
            <Bar
              key={band}
              isAnimationActive={false}
              dataKey={band}
              stackId="households"
              fill={`var(--color-${band})`}
              radius={i === NEED_PRIORITY_ORDER.length - 1 ? [0, 4, 4, 0] : 0}
            />
          ))}
        </BarChart>
      </ChartContainer>
    </ChartCard>
  )
}
