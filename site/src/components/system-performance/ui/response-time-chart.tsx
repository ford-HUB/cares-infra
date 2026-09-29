import { CartesianGrid, Line, LineChart, ReferenceLine, XAxis, YAxis } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import {
  RESPONSE_SERIES_COLOR,
  RESPONSE_STRAINED_MS,
  formatDuration,
  formatSampleTime,
  type PerformanceRangeId,
} from '../../../constants/system-performance'
import type { PerformanceSample } from '../../../types/system-performance'
import { ChartCard } from './chart-card'

interface ResponseTimeChartProps {
  samples: PerformanceSample[]
  range: PerformanceRangeId
}

const CHART_HEIGHT = 'h-64'

const config: ChartConfig = {
  p50: { label: 'Median', color: RESPONSE_SERIES_COLOR.p50 },
  p95: { label: 'Slow tail (p95)', color: RESPONSE_SERIES_COLOR.p95 },
}

/**
 * Loading time as staff experience it: the median is the ordinary wait, the p95 is the
 * one that gets reported as "the portal is stuck". Charting both on one scale shows the
 * gap between them — a widening gap means queueing, not a slower server.
 */
export function ResponseTimeChart({ samples, range }: ResponseTimeChartProps) {
  const rows = samples.map((sample) => ({
    at: formatSampleTime(sample.at, range),
    p50: sample.responseP50Ms,
    p95: sample.responseP95Ms,
  }))

  const latest = samples[samples.length - 1]

  return (
    <ChartCard
      title="Request loading time"
      hint="Server-side, in milliseconds. The dashed line is where staff start noticing."
      aside={
        <span className="text-[12px] text-gray-400 tabular-nums">
          worst {formatDuration(Math.max(...samples.map((one) => one.responseP95Ms)))}
        </span>
      }
    >
      <ChartContainer config={config} className={`w-full ${CHART_HEIGHT}`}>
        <LineChart data={rows} margin={{ left: 4, right: 12, top: 8 }}>
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
            width={52}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            className="text-[11px]"
            tickFormatter={(value: number) => formatDuration(value)}
          />
          {/* The budget, not a data series — grey so it never competes with the lines. */}
          <ReferenceLine
            y={RESPONSE_STRAINED_MS}
            stroke="#9ca3af"
            strokeDasharray="4 4"
            label={{
              value: `${RESPONSE_STRAINED_MS} ms budget`,
              position: 'insideTopRight',
              fill: '#9ca3af',
              fontSize: 11,
            }}
          />
          <ChartTooltip
            cursor={{ stroke: '#d1d5db', strokeDasharray: '4 4' }}
            content={
              <ChartTooltipContent formatter={(value) => formatDuration(Number(value))} />
            }
          />

          <Line
            type="monotone"
            dataKey="p50"
            stroke="var(--color-p50)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 5, strokeWidth: 2, stroke: '#ffffff' }}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="p95"
            stroke="var(--color-p95)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 5, strokeWidth: 2, stroke: '#ffffff' }}
            isAnimationActive={false}
          />
        </LineChart>
      </ChartContainer>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="flex items-center gap-1.5 text-[12px] text-gray-600 tabular-nums">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: RESPONSE_SERIES_COLOR.p50 }}
          />
          Median {formatDuration(latest.responseP50Ms)}
        </span>
        <span className="flex items-center gap-1.5 text-[12px] text-gray-600 tabular-nums">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: RESPONSE_SERIES_COLOR.p95 }}
          />
          Slow tail {formatDuration(latest.responseP95Ms)}
        </span>
      </div>
    </ChartCard>
  )
}
