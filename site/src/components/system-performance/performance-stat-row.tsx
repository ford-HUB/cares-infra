import { Activity, Gauge, MemoryStick, Timer } from 'lucide-react'
import {
  CPU_BAND_COLOR,
  RESPONSE_SERIES_COLOR,
  formatDuration,
  memoryHealth,
  responseHealth,
} from '../../constants/system-performance'
import { formatNumber } from '../../constants/formatting'
import type { PerformanceHost, PerformanceSample } from '../../types/system-performance'
import { PerformanceStatTile } from './ui/performance-stat-tile'

interface PerformanceStatRowProps {
  samples: PerformanceSample[]
  host: PerformanceHost
}

/** Change from the window's first reading to its last, as a signed ratio. */
function driftOf(values: number[]): number {
  const first = values[0]
  const last = values[values.length - 1]
  return first > 0 ? (last - first) / first : 0
}

/**
 * The four readings that are not CPU: memory, the two halves of loading time, and the
 * traffic producing both. They are independent measurements — no whole to divide — so
 * they get equal-weight tiles rather than a shared bar.
 */
export function PerformanceStatRow({ samples, host }: PerformanceStatRowProps) {
  const latest = samples[samples.length - 1]

  const memory = samples.map((one) => one.memoryPercent)
  const p50 = samples.map((one) => one.responseP50Ms)
  const p95 = samples.map((one) => one.responseP95Ms)
  const throughput = samples.map((one) => one.requestsPerMinute)

  return (
    <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <PerformanceStatTile
        label="Memory in use"
        value={`${Math.round(latest.memoryPercent)}%`}
        meta={`of ${host.memoryGb} GB`}
        icon={MemoryStick}
        health={memoryHealth(latest.memoryPercent)}
        delta={driftOf(memory)}
        riseIsBad
        history={memory}
        sparkColor={CPU_BAND_COLOR.ioWait}
      />
      <PerformanceStatTile
        label="Median response"
        value={formatDuration(latest.responseP50Ms)}
        meta="what most staff feel"
        icon={Timer}
        health={responseHealth(latest.responseP50Ms)}
        delta={driftOf(p50)}
        riseIsBad
        history={p50}
        sparkColor={RESPONSE_SERIES_COLOR.p50}
      />
      <PerformanceStatTile
        label="Slow tail (p95)"
        value={formatDuration(latest.responseP95Ms)}
        meta="1 request in 20 is slower"
        icon={Gauge}
        health={responseHealth(latest.responseP95Ms)}
        delta={driftOf(p95)}
        riseIsBad
        history={p95}
        sparkColor={RESPONSE_SERIES_COLOR.p95}
      />
      <PerformanceStatTile
        label="Throughput"
        value={formatNumber(latest.requestsPerMinute)}
        meta="requests / min"
        icon={Activity}
        delta={driftOf(throughput)}
        history={throughput}
        sparkColor={CPU_BAND_COLOR.user}
      />
    </div>
  )
}
