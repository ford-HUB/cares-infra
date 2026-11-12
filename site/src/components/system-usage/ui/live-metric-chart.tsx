import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { USAGE_SERIES_THEME, formatSampleClock } from '../../../constants/system-usage'
import type { LiveSourceState } from '../../../types/system-usage'
import { UsageCard } from './usage-card'

interface LiveMetricChartProps {
  title: string
  hint: string
  /** The last 24 h from the performance snapshot, oldest first. */
  points: { at: string; value: number }[]
  /** The 3 s tick's reading — the headline; falls back to the newest point. */
  now: number | null
  format: (value: number) => string
  /** Unit shown after the headline and average only, so the axis ticks stay short. */
  unit?: string
  /** Pin the axis (e.g. 0–100 for a percentage); omitted, it scales from zero. */
  domain?: [number, number]
  source: LiveSourceState
}

/**
 * One live measure over the last 24 h as a small multiple — memory, traffic and
 * response time each get their own chart rather than a second y-axis beside CPU.
 * A single series, so the title names it and there is no legend.
 */
export function LiveMetricChart({
  title,
  hint,
  points,
  now,
  format,
  unit = '',
  domain,
  source,
}: LiveMetricChartProps) {
  const config = { value: { label: title, theme: USAGE_SERIES_THEME.average } } satisfies ChartConfig
  const headline = now ?? points[points.length - 1]?.value ?? null
  const average = points.length ? points.reduce((sum, p) => sum + p.value, 0) / points.length : null

  return (
    <UsageCard
      title={title}
      hint={hint}
      aside={
        headline !== null && (
          <div className="text-right">
            <p className="text-lg font-semibold text-gray-900 tabular-nums">
              {format(headline)}
              {unit && <span className="ml-0.5 text-[12px] font-normal text-gray-400">{unit}</span>}
            </p>
            {average !== null && (
              <p className="text-[11px] text-gray-400 tabular-nums">
                now · 24 h avg {format(average)}
                {unit}
              </p>
            )}
          </div>
        )
      }
    >
      {points.length === 0 ? (
        <div className="flex h-32 items-center justify-center text-center text-[12px] text-gray-400">
          {!source.allowed
            ? 'Your account can’t read system performance.'
            : (source.error ?? 'No readings in the last 24 hours yet.')}
        </div>
      ) : (
        <ChartContainer config={config} className="h-32 w-full">
          <AreaChart data={points} margin={{ left: 0, right: 8, top: 4 }}>
            <CartesianGrid vertical={false} stroke="var(--color-gray-100)" />
            <XAxis dataKey="at" hide />
            <YAxis
              width={56}
              domain={domain ?? [0, 'auto']}
              tickCount={3}
              tickLine={false}
              axisLine={false}
              className="text-[10px]"
              tickFormatter={(value: number) => format(value)}
            />
            <ChartTooltip
              cursor={{ stroke: 'var(--color-gray-300)', strokeDasharray: '4 4' }}
              content={
                <ChartTooltipContent
                  hideIndicator
                  labelFormatter={(_, payload) => {
                    const at = payload?.[0]?.payload?.at as string | undefined
                    return at ? formatSampleClock(at) : ''
                  }}
                  formatter={(value) => (
                    <span className="font-medium text-foreground tabular-nums">
                      {format(Number(value))}
                    </span>
                  )}
                />
              }
            />
            <Area
              dataKey="value"
              type="monotone"
              stroke="var(--color-value)"
              strokeWidth={2}
              fill="var(--color-value)"
              fillOpacity={0.12}
              dot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ChartContainer>
      )}
    </UsageCard>
  )
}
