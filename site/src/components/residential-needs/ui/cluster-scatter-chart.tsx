import { CartesianGrid, Scatter, ScatterChart, XAxis, YAxis, ZAxis } from 'recharts'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { ChartCard } from '../../statistics/ui/chart-card'
import {
  CLUSTER_COLORS,
  CLUSTER_SCATTER_X,
  CLUSTER_SCATTER_Y,
  NEED_SCORE_MAX,
  NEEDS_CHART_HEIGHT,
  NEEDS_FEATURE_LABELS,
  NEEDS_GRID_STROKE,
} from '../../../constants/residential-needs'
import type {
  Household,
  NeedsClusteringResult,
} from '../../../types/residential-needs'
import { featureValue } from '../../../utils/needs-kmeans'

interface ClusterScatterChartProps {
  households: Household[]
  result: NeedsClusteringResult
  /** The cluster the cards have selected — the others fade so it stands out. */
  selected: number | null
}

/**
 * The clusters on two need scores a director already thinks in — food against
 * health. The model ran on all seven features; this is a projection, so two dots
 * that overlap here may still sit in different groups. Dots are jittered a touch so
 * households with identical scores do not stack into one.
 */
const JITTER = 0.18
export function ClusterScatterChart({ households, result, selected }: ClusterScatterChartProps) {
  const config: ChartConfig = Object.fromEntries(
    result.clusters.map((cluster) => [
      `cluster-${cluster.index}`,
      {
        label: `Cluster ${cluster.index + 1}`,
        color: CLUSTER_COLORS[cluster.index % CLUSTER_COLORS.length],
      },
    ]),
  )

  const series = result.clusters.map((cluster) => ({
    key: `cluster-${cluster.index}`,
    index: cluster.index,
    points: households
      .filter((h) => result.assignments[h.id] === cluster.index)
      .map((h, i) => ({
        x: featureValue(h, CLUSTER_SCATTER_X) + ((i % 5) - 2) * (JITTER / 2),
        y: featureValue(h, CLUSTER_SCATTER_Y) + ((Math.floor(i / 5) % 5) - 2) * (JITTER / 2),
        name: `${h.familyName} family · Brgy. ${h.barangay}`,
      })),
  }))

  return (
    <ChartCard
      title="Cluster map"
      description={`${NEEDS_FEATURE_LABELS[CLUSTER_SCATTER_X]} against ${NEEDS_FEATURE_LABELS[CLUSTER_SCATTER_Y].toLowerCase()} — one dot per household.`}
    >
      <ChartContainer config={config} className={`w-full ${NEEDS_CHART_HEIGHT}`}>
        <ScatterChart margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
          <CartesianGrid stroke={NEEDS_GRID_STROKE} />
          <XAxis
            type="number"
            dataKey="x"
            name={NEEDS_FEATURE_LABELS[CLUSTER_SCATTER_X]}
            domain={[-0.5, NEED_SCORE_MAX + 0.5]}
            ticks={[0, 1, 2, 3, 4, 5]}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            className="text-[11px]"
          />
          <YAxis
            type="number"
            dataKey="y"
            name={NEEDS_FEATURE_LABELS[CLUSTER_SCATTER_Y]}
            domain={[-0.5, NEED_SCORE_MAX + 0.5]}
            ticks={[0, 1, 2, 3, 4, 5]}
            width={28}
            tickLine={false}
            axisLine={false}
            className="text-[11px]"
          />
          <ZAxis range={[48, 48]} />
          <ChartTooltip
            cursor={{ strokeDasharray: '3 3', stroke: '#d1d5db' }}
            content={
              <ChartTooltipContent
                labelKey="name"
                formatter={(value, name) =>
                  `${NEEDS_FEATURE_LABELS[name === 'x' ? CLUSTER_SCATTER_X : CLUSTER_SCATTER_Y]}: ${Math.round(Number(value))} / ${NEED_SCORE_MAX}`
                }
              />
            }
          />
          <ChartLegend content={<ChartLegendContent />} />
          {series.map((one) => (
            <Scatter
              key={one.key}
              name={one.key}
              data={one.points}
              fill={`var(--color-${one.key})`}
              fillOpacity={selected === null || selected === one.index ? 0.85 : 0.15}
              isAnimationActive={false}
            />
          ))}
        </ScatterChart>
      </ChartContainer>
    </ChartCard>
  )
}
