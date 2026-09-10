import { Cpu } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { TooltipProvider } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import {
  CPU_BAND_BAR_STYLES,
  CPU_BAND_ORDER,
  CPU_IDLE_BAR_STYLE,
  HEALTH_DOT_STYLES,
  HEALTH_LABELS,
  HEALTH_STYLES,
  bandValue,
  cpuBusy,
  formatUptime,
  overallHealth,
} from '../../constants/system-performance'
import type {
  CpuBand,
  PerformanceHost,
  PerformanceSample,
} from '../../types/system-performance'
import { LivePulse } from '../attendance/ui/live-pulse'
import { CpuBandSegment } from './ui/cpu-band-segment'

interface PerformanceBannerProps {
  /** The newest reading — everything here is "right now", not an average. */
  sample: PerformanceSample
  host: PerformanceHost
  loadAverage: [number, number, number]
  /** Which band the CPU chart is focused on, or null while all three are charted. */
  focus: CpuBand | null
  onFocusChange: (band: CpuBand | null) => void
  /** True while the live window is appending readings. */
  streaming: boolean
}

/**
 * The one question this page answers: how much of the host is being used right now.
 * The three CPU bands are parts of that single measurement, so they share one capacity
 * bar rather than sitting as three tiles — and each part focuses the chart below it.
 */
export function PerformanceBanner({
  sample,
  host,
  loadAverage,
  focus,
  onFocusChange,
  streaming,
}: PerformanceBannerProps) {
  const busy = cpuBusy(sample)
  const health = overallHealth(sample)
  const shareOfBusy = (value: number) => (busy > 0 ? value / busy : 0)
  const toggle = (band: CpuBand) => onFocusChange(focus === band ? null : band)

  return (
    <TooltipProvider>
      <Card size="sm" className="mb-4 shrink-0 shadow-sm">
        <CardContent className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="flex items-center gap-3 lg:w-64 lg:shrink-0">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--cares-tag-system-bg)] text-[var(--cares-tag-system-text)]">
              <Cpu className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-[11px] tracking-wider text-gray-500 uppercase">
                {streaming && <LivePulse colorClass="bg-red-500" animate />}
                CPU in use
              </p>
              <p className="flex items-baseline gap-1.5">
                <span className="text-2xl leading-tight font-semibold text-gray-900 tabular-nums">
                  {Math.round(busy)}%
                </span>
                <span className="truncate text-[13px] text-gray-400 tabular-nums">
                  of {host.vcpu} vCPU
                </span>
              </p>
            </div>
          </div>

          <div className="hidden w-px self-stretch bg-gray-100 lg:block" />

          <div className="min-w-0 flex-1 space-y-2">
            {/* One bar, four parts: the three busy bands and the headroom that is left. */}
            <div className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-gray-100">
              {CPU_BAND_ORDER.map((band) => (
                <div
                  key={band}
                  className={cn(
                    'h-full rounded-full transition-[width] duration-500',
                    CPU_BAND_BAR_STYLES[band],
                    focus && focus !== band && 'opacity-30',
                  )}
                  style={{ width: `${bandValue(sample, band)}%` }}
                />
              ))}
              <div
                className={cn('h-full rounded-full transition-[width] duration-500', CPU_IDLE_BAR_STYLE)}
                style={{ width: `${Math.max(0, 100 - busy)}%` }}
              />
            </div>

            <div className="flex flex-wrap items-center gap-1 sm:flex-nowrap">
              {CPU_BAND_ORDER.map((band) => (
                <CpuBandSegment
                  key={band}
                  band={band}
                  value={bandValue(sample, band)}
                  shareOfBusy={shareOfBusy(bandValue(sample, band))}
                  active={focus === band}
                  onToggle={toggle}
                />
              ))}
            </div>
          </div>

          <div className="hidden w-px self-stretch bg-gray-100 lg:block" />

          <div className="lg:w-44 lg:shrink-0">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[12px] font-medium',
                HEALTH_STYLES[health],
              )}
            >
              <span className={cn('h-1.5 w-1.5 rounded-full', HEALTH_DOT_STYLES[health])} />
              {HEALTH_LABELS[health]}
            </span>
            <p className="mt-1.5 text-[12px] text-gray-500 tabular-nums">
              Load {loadAverage.map((one) => one.toFixed(2)).join(' · ')}
            </p>
            <p className="mt-0.5 truncate text-[11px] text-gray-400">
              {host.name} · up {formatUptime(host.uptimeHours)}
            </p>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}
