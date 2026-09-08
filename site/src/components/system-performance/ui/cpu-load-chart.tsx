import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import {
  CPU_BAND_COLOR,
  CPU_BAND_LABELS,
  CPU_BAND_ORDER,
  bandValue,
  cpuBusy,
  formatSampleTime,
  type PerformanceRangeId,
} from '../../../constants/system-performance'
import type { CpuBand, PerformanceSample } from '../../../types/system-performance'
import { ChartCard } from './chart-card'

interface CpuLoadChartProps {
  samples: PerformanceSample[]
  range: PerformanceRangeId
  /** Set by the banner's legend; the other two bands fall back rather than vanish. */
  focus: CpuBand | null
}

const CHART_HEIGHT = 'h-64'

const config: ChartConfig = Object.fromEntries(
  CPU_BAND_ORDER.map((band) => [
    band,
    { label: CPU_BAND_LABELS[band], color: CPU_BAND_COLOR[band] },
  ]),
)

/**
 * Where the host's time goes, stacked so the top of the stack is total CPU busy and
 * the gap above it is real headroom. The y-axis is pinned to 100 % on purpose: an
 * auto-scaled axis makes a quiet host look as alarming as a saturated one.
 */
export function CpuLoadChart({ samples, range, focus }: CpuLoadChartProps) {
  const rows = samples.map((sample) => ({
    at: formatSampleTime(sample.at, range),
    user: sample.cpuUser,
    system: sample.cpuSystem,
    ioWait: sample.cpuIoWait,
  }))

  const latest = samples[samples.length - 1]

  return (
    <ChartCard
      title="CPU load"
      hint="Stacked to total busy CPU; the space above the stack is headroom."
      aside={
        <span className="text-[12px] text-gray-400 tabular-nums">
          now {Math.round(cpuBusy(latest))}% · peak{' '}
          {Math.round(Math.max(...samples.map(cpuBusy)))}%
        </span>
      }
    >
      <ChartContainer config={config} className={`w-full ${CHART_HEIGHT}`}>
        <AreaChart data={rows} margin={{ left: 4, right: 12, top: 8 }}>
          <CartesianGrid vertical={false} stroke="#f3f4f6" />
          <XAxis
            dataKey="at"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={48}
            className="text-[11px]"
          />
          <YAxis
            width={40}
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            className="text-[11px]"
            tickFormatter={(value: number) => `${value}%`}
          />
          <ChartTooltip
            cursor={{ stroke: '#d1d5db', strokeDasharray: '4 4' }}
            content={
              <ChartTooltipContent
                formatter={(value, name) => `${CPU_BAND_LABELS[name as CpuBand] ?? name}: ${Number(value).toFixed(1)}%`}
              />
            }
          />

          {CPU_BAND_ORDER.map((band) => (
            <Area
              key={band}
              type="monotone"
              dataKey={band}
              stackId="cpu"
              stroke={`var(--color-${band})`}
              fill={`var(--color-${band})`}
              fillOpacity={focus && focus !== band ? 0.08 : 0.24}
              strokeOpacity={focus && focus !== band ? 0.25 : 1}
              strokeWidth={2}
              // A stream repainting every three seconds must not re-animate each tick.
              isAnimationActive={false}
              dot={false}
            />
          ))}
        </AreaChart>
      </ChartContainer>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {CPU_BAND_ORDER.map((band) => (
          <span
            key={band}
            className="flex items-center gap-1.5 text-[12px] text-gray-600 tabular-nums"
            style={{ opacity: focus && focus !== band ? 0.4 : 1 }}
          >
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: CPU_BAND_COLOR[band] }}
            />
            {CPU_BAND_LABELS[band]} {bandValue(latest, band).toFixed(1)}%
          </span>
        ))}
      </div>
    </ChartCard>
  )
}
