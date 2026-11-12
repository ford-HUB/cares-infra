import { Cpu, Server } from 'lucide-react'
import type { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import {
  DIAGNOSTIC_OVERALL_LABELS,
  DIAGNOSTIC_OVERALL_STYLES,
} from '../../constants/system-diagnostics'
import {
  HEALTH_LABELS,
  HEALTH_STYLES,
  cpuBusy,
  cpuHealth,
  memoryHealth,
} from '../../constants/system-performance'
import {
  SERVICE_HEALTH_BAR_STYLES,
  SERVICE_HEALTH_DOT_STYLES,
  SERVICE_HEALTH_LABELS,
  SERVICE_HEALTH_ORDER,
  formatPercent,
} from '../../constants/system-usage'
import type { PerformanceHost, PerformanceSample } from '../../types/system-performance'
import type {
  DailyUsage,
  LiveSourceState,
  ServiceHealth,
  SystemHealthSummary,
} from '../../types/system-usage'

interface SystemUsageSummaryProps {
  liveSample: PerformanceSample | null
  today: DailyUsage | null
  host: PerformanceHost | null
  health: SystemHealthSummary
  counts: Record<ServiceHealth, number>
  totalServices: number
  performanceSource: LiveSourceState
  servicesSource: LiveSourceState
  healthFilter: ServiceHealth | null
  onHealthFilter: (health: ServiceHealth) => void
}

const Divider = () => <div className="hidden w-px self-stretch bg-gray-100 lg:block" />

const Label = ({ children }: { children: ReactNode }) => (
  <p className="text-[11px] tracking-wider text-gray-500 uppercase">{children}</p>
)

/** Why a live zone has no number — no right, or the endpoint didn't answer. */
function Unavailable({ source }: { source: LiveSourceState }) {
  return (
    <p className="text-[12px] text-gray-400">
      {!source.allowed ? 'Your account can’t read this' : (source.error ?? 'Waiting for data…')}
    </p>
  )
}

/**
 * The live state in one card. The one number is CPU right now (the 3 s tick) —
 * the only thing on the screen that animates, a pulse meaning "live". Beside it:
 * memory now, the diagnostics verdict, and the services as parts of one fleet —
 * one segmented bar whose legend filters the table below.
 */
export function SystemUsageSummary({
  liveSample,
  today,
  host,
  health,
  counts,
  totalServices,
  performanceSource,
  servicesSource,
  healthFilter,
  onHealthFilter,
}: SystemUsageSummaryProps) {
  const cpuNow = liveSample ? cpuBusy(liveSample) : null
  const cpuState = cpuNow === null ? null : cpuHealth(cpuNow)
  const memNow = liveSample?.memoryPercent ?? null
  const memState = memNow === null ? null : memoryHealth(memNow)
  const present = SERVICE_HEALTH_ORDER.filter((h) => counts[h] > 0)

  return (
    <Card size="sm" className="mb-4 shadow-sm">
      <CardContent className="flex flex-col gap-4 lg:flex-row lg:items-center">
        {/* The one number */}
        <div className="flex items-center gap-3 lg:min-w-[16rem]">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <Cpu className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <Label>CPU now</Label>
              {cpuNow !== null && (
                <span className="relative flex h-2 w-2" aria-label="Live">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60 motion-reduce:animate-none" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
              )}
            </div>
            {cpuNow === null || !cpuState ? (
              <Unavailable source={performanceSource} />
            ) : (
              <>
                <p className="flex items-center gap-2">
                  <span className="text-2xl font-semibold text-gray-900 tabular-nums">
                    {formatPercent(cpuNow)}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${HEALTH_STYLES[cpuState]}`}>
                    {HEALTH_LABELS[cpuState]}
                  </span>
                  {host && <span className="text-[12px] text-gray-400">of {host.vcpu} vCPU</span>}
                </p>
                {today && (
                  <p className="text-[12px] text-gray-500 tabular-nums">
                    24 h avg {formatPercent(today.cpuAvg)} · peak {formatPercent(today.cpuPeak)}
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        <Divider />

        <div className="min-w-0">
          <Label>Memory now</Label>
          {memNow === null || !memState ? (
            <Unavailable source={performanceSource} />
          ) : (
            <>
              <p className="flex items-center gap-2">
                <span className="text-lg font-semibold text-gray-900 tabular-nums">
                  {formatPercent(memNow)}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${HEALTH_STYLES[memState]}`}>
                  {HEALTH_LABELS[memState]}
                </span>
              </p>
              {host && <p className="text-[12px] text-gray-400">of {host.memoryGb} GB</p>}
            </>
          )}
        </div>

        <Divider />

        <div className="min-w-0">
          <Label>System health</Label>
          {!health.overall ? (
            <Unavailable source={servicesSource} />
          ) : (
            <>
              <p className="mt-0.5">
                <span className={`rounded-full px-2 py-0.5 text-[12px] font-medium ${DIAGNOSTIC_OVERALL_STYLES[health.overall]}`}>
                  {DIAGNOSTIC_OVERALL_LABELS[health.overall]}
                </span>
              </p>
              {health.healthyPercent !== null && (
                <p className="mt-1 text-[12px] text-gray-400 tabular-nums">
                  {formatPercent(health.healthyPercent)} of last {health.sweeps} checks healthy
                </p>
              )}
            </>
          )}
        </div>

        <Divider />

        {/* Services as parts of one fleet */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Server className="h-3.5 w-3.5 text-gray-400" />
            <Label>Services</Label>
          </div>
          {totalServices === 0 ? (
            <Unavailable source={servicesSource} />
          ) : (
            <>
              <p className="text-[13px] text-gray-700">
                <span className="text-lg font-semibold text-gray-900 tabular-nums">
                  {counts.operational}
                </span>{' '}
                of {totalServices} operational
              </p>
              <div className="mt-1.5 flex h-2 w-full gap-0.5 overflow-hidden rounded-full" aria-hidden>
                {present.map((h) => (
                  <span
                    key={h}
                    className={`h-full transition-opacity ${SERVICE_HEALTH_BAR_STYLES[h]} ${
                      healthFilter && healthFilter !== h ? 'opacity-30' : ''
                    }`}
                    style={{ width: `${(counts[h] / totalServices) * 100}%` }}
                  />
                ))}
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {present.map((h) => (
                  <button
                    key={h}
                    type="button"
                    aria-pressed={healthFilter === h}
                    onClick={() => onHealthFilter(h)}
                    className={`flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[12px] text-gray-600 transition-colors hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-[var(--cares-primary)] focus-visible:outline-none ${
                      healthFilter === h ? 'bg-gray-100 font-medium text-gray-900' : ''
                    }`}
                  >
                    <span className={`h-2 w-2 rounded-full ${SERVICE_HEALTH_DOT_STYLES[h]}`} />
                    {SERVICE_HEALTH_LABELS[h]}
                    <span className="tabular-nums">{counts[h]}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
