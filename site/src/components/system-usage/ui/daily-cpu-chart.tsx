import { Bar, CartesianGrid, Cell, ComposedChart, Line, ReferenceLine, XAxis, YAxis } from 'recharts'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { CPU_STRAINED_PERCENT } from '../../../constants/system-performance'
import {
  SAMPLE_DAY_OPACITY,
  SYSTEM_USAGE_RANGES,
  USAGE_SERIES_THEME,
  formatPercent,
  formatUsageDay,
  formatUsageDayLong,
} from '../../../constants/system-usage'
import type { DailyUsage, SystemUsageRangeDays } from '../../../types/system-usage'
import { UsageCard } from './usage-card'

const config = {
  average: { label: 'Daily average', theme: USAGE_SERIES_THEME.average },
  peak: { label: 'Daily peak', theme: USAGE_SERIES_THEME.peak },
} satisfies ChartConfig

const LIVE_DAY_LABEL = 'Last 24 h'

interface DailyCpuChartProps {
  daily: DailyUsage[]
  range: SystemUsageRangeDays
  onRangeChange: (range: SystemUsageRangeDays) => void
}

interface PeakDotProps {
  cx?: number
  cy?: number
  index?: number
  payload?: { sample: boolean }
}

/** Faded on sample days, like the bar beneath it. */
function renderPeakDot({ cx, cy, index, payload }: PeakDotProps) {
  if (cx === undefined || cy === undefined) return <g key={index} />
  return (
    <circle
      key={index}
      cx={cx}
      cy={cy}
      r={4}
      strokeWidth={2}
      stroke="var(--color-card)"
      fill="var(--color-peak)"
      opacity={payload?.sample ? SAMPLE_DAY_OPACITY : 1}
    />
  )
}

/** Axis pinned to 0–100 %. Only the last bar is live (server's last 24 h); earlier days are sample data until a daily history exists, so they're faded. */
export function DailyCpuChart({ daily, range, onRangeChange }: DailyCpuChartProps) {
  const rows = daily.map((d) => ({
    date: d.date,
    day: d.sample ? formatUsageDay(d.date) : LIVE_DAY_LABEL,
    average: d.cpuAvg,
    peak: d.cpuPeak,
    sample: d.sample,
  }))
  const hasSample = daily.some((d) => d.sample)
  const hasLive = daily.some((d) => !d.sample)

  return (
    <UsageCard
      title="CPU usage per day"
      hint="Bars are the day's average; the line is its busiest moment."
      aside={
        <ToggleGroup
          type="single"
          value={String(range)}
          onValueChange={(value) => value && onRangeChange(Number(value) as SystemUsageRangeDays)}
          variant="outline"
          size="sm"
          aria-label="Days shown"
        >
          {SYSTEM_USAGE_RANGES.map((option) => (
            <ToggleGroupItem key={option.days} value={String(option.days)} className="px-3">
              {option.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      }
    >
      <ChartContainer config={config} className="h-72 w-full">
        <ComposedChart data={rows} margin={{ left: 4, right: 12, top: 8 }}>
          <CartesianGrid vertical={false} stroke="var(--color-gray-100)" />
          <XAxis
            dataKey="day"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={24}
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
          {/* A threshold, not a series; grey so it never competes with the data. */}
          <ReferenceLine
            y={CPU_STRAINED_PERCENT}
            stroke="var(--color-gray-400)"
            strokeDasharray="4 4"
            label={{
              value: `Strained ${CPU_STRAINED_PERCENT}%`,
              position: 'insideTopLeft',
              fill: 'var(--color-gray-500)',
              fontSize: 11,
            }}
          />
          <ChartTooltip
            cursor={{ fill: 'var(--color-gray-100)', opacity: 0.6 }}
            content={
              <ChartTooltipContent
                labelFormatter={(_, payload) => {
                  const row = payload?.[0]?.payload as { date: string; sample: boolean } | undefined
                  if (!row) return ''
                  return row.sample
                    ? `${formatUsageDayLong(row.date)} · sample data`
                    : `${LIVE_DAY_LABEL} · live`
                }}
                formatter={(value, name) => (
                  <span className="flex w-full justify-between gap-4">
                    <span className="text-muted-foreground">
                      {config[name as keyof typeof config]?.label ?? name}
                    </span>
                    <span className="font-medium text-foreground tabular-nums">
                      {formatPercent(Number(value), 1)}
                    </span>
                  </span>
                )}
              />
            }
          />
          <Bar dataKey="average" fill="var(--color-average)" radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false}>
            {rows.map((row) => (
              <Cell key={row.date} fillOpacity={row.sample ? SAMPLE_DAY_OPACITY : 1} />
            ))}
          </Bar>
          <Line
            dataKey="peak"
            type="monotone"
            stroke="var(--color-peak)"
            strokeWidth={2}
            strokeOpacity={hasSample ? 0.55 : 1}
            dot={renderPeakDot}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
          {/* Inside the chart, where the theme's series colours are defined. */}
          <ChartLegend content={<ChartLegendContent className="text-[12px] text-gray-600" />} />
        </ComposedChart>
      </ChartContainer>

      {hasSample && (
        <p className="text-[12px] text-gray-500">
          {hasLive ? (
            <>
              <span className="font-medium text-gray-700">{LIVE_DAY_LABEL}</span> is live. Faded
              days are sample data — the server keeps CPU readings for 24 hours only, so earlier
              days will fill in once it records a daily history.
            </>
          ) : (
            'Every day shown is sample data — live CPU readings aren’t available to this account right now.'
          )}
        </p>
      )}
    </UsageCard>
  )
}
