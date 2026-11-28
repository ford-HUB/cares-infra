import type {
  CpuBand,
  CpuCore,
  CpuFinding,
  HealthState,
  HttpMethod,
  PerformanceSample,
  ProcessLoad,
  ProcessOwner,
} from '../types/system-performance'

export const PERFORMANCE_TICK_MS = 3_000

export type PerformanceRangeId = 'live' | 'hour' | 'day'

export interface PerformanceRange {
  id: PerformanceRangeId
  label: string
  points: number
  stepSeconds: number
  /** Hour/day views are aggregates, so only live streams. */
  streaming: boolean
}

export const PERFORMANCE_RANGES: PerformanceRange[] = [
  { id: 'live', label: 'Live', points: 60, stepSeconds: 3, streaming: true },
  { id: 'hour', label: '1 h', points: 60, stepSeconds: 60, streaming: false },
  { id: 'day', label: '24 h', points: 72, stepSeconds: 1_200, streaming: false },
]

export const DEFAULT_PERFORMANCE_RANGE: PerformanceRangeId = 'live'

export function findPerformanceRange(id: PerformanceRangeId): PerformanceRange {
  return PERFORMANCE_RANGES.find((range) => range.id === id) ?? PERFORMANCE_RANGES[0]
}

export const CPU_BAND_ORDER: CpuBand[] = ['user', 'system', 'ioWait']

export const CPU_BAND_LABELS: Record<CpuBand, string> = {
  user: 'Application',
  system: 'Kernel',
  ioWait: 'I/O wait',
}

export const CPU_BAND_HINTS: Record<CpuBand, string> = {
  user: 'CARES code itself: API handlers, the ML services, report jobs.',
  system: 'The kernel working on their behalf — sockets, disk, scheduling.',
  ioWait: 'Cores idle but blocked, waiting on disk or the database to answer.',
}

/** CVD-validated categorical trio; never status colours. */
export const CPU_BAND_COLOR: Record<CpuBand, string> = {
  user: '#2563eb',
  system: '#c2410c',
  ioWait: '#0d9488',
}

export const CPU_BAND_BAR_STYLES: Record<CpuBand, string> = {
  user: 'bg-[#2563eb]',
  system: 'bg-[#c2410c]',
  ioWait: 'bg-[#0d9488]',
}

export const RESPONSE_SERIES_COLOR = {
  p50: '#2563eb',
  p95: '#c2410c',
} as const

export const CPU_IDLE_BAR_STYLE = 'bg-gray-200'

export const HEALTH_LABELS: Record<HealthState, string> = {
  healthy: 'Healthy',
  strained: 'Strained',
  critical: 'Critical',
}

export const HEALTH_STYLES: Record<HealthState, string> = {
  healthy: 'bg-emerald-50 text-emerald-700',
  strained: 'bg-amber-50 text-amber-700',
  critical: 'bg-red-50 text-red-700',
}

export const HEALTH_DOT_STYLES: Record<HealthState, string> = {
  healthy: 'bg-emerald-500',
  strained: 'bg-amber-500',
  critical: 'bg-red-500',
}

export const CPU_STRAINED_PERCENT = 65
export const CPU_CRITICAL_PERCENT = 85

export const RESPONSE_STRAINED_MS = 600
export const RESPONSE_CRITICAL_MS = 1_200

export const MEMORY_STRAINED_PERCENT = 75
export const MEMORY_CRITICAL_PERCENT = 90

function worst(...states: HealthState[]): HealthState {
  if (states.includes('critical')) return 'critical'
  if (states.includes('strained')) return 'strained'
  return 'healthy'
}

export function cpuHealth(percent: number): HealthState {
  if (percent >= CPU_CRITICAL_PERCENT) return 'critical'
  if (percent >= CPU_STRAINED_PERCENT) return 'strained'
  return 'healthy'
}

export function responseHealth(p95Ms: number): HealthState {
  if (p95Ms >= RESPONSE_CRITICAL_MS) return 'critical'
  if (p95Ms >= RESPONSE_STRAINED_MS) return 'strained'
  return 'healthy'
}

export function memoryHealth(percent: number): HealthState {
  if (percent >= MEMORY_CRITICAL_PERCENT) return 'critical'
  if (percent >= MEMORY_STRAINED_PERCENT) return 'strained'
  return 'healthy'
}

export function cpuBusy(sample: PerformanceSample): number {
  return sample.cpuUser + sample.cpuSystem + sample.cpuIoWait
}

export function bandValue(sample: PerformanceSample, band: CpuBand): number {
  if (band === 'user') return sample.cpuUser
  if (band === 'system') return sample.cpuSystem
  return sample.cpuIoWait
}

/** Combines CPU with response tail: busy-but-fast is healthy, idle-but-slow is not. */
export function overallHealth(sample: PerformanceSample): HealthState {
  return worst(cpuHealth(cpuBusy(sample)), responseHealth(sample.responseP95Ms))
}

export const HEALTH_TEXT_STYLES: Record<HealthState, string> = {
  healthy: 'text-gray-900',
  strained: 'text-amber-700',
  critical: 'text-red-700',
}

export const PROCESS_OWNER_LABELS: Record<ProcessOwner, string> = {
  server: 'NestJS API',
  microservices: 'Python ML',
  database: 'PostgreSQL',
  site: 'Static site',
  other: 'Other',
}

export const HTTP_METHOD_STYLES: Record<HttpMethod, string> = {
  GET: 'bg-gray-100 text-gray-600',
  POST: 'bg-blue-50 text-blue-700',
  PUT: 'bg-amber-50 text-amber-700',
  PATCH: 'bg-amber-50 text-amber-700',
  DELETE: 'bg-red-50 text-red-700',
}

export type EndpointSort = 'slowest' | 'busiest'

export const ENDPOINT_SORT_LABELS: Record<EndpointSort, string> = {
  slowest: 'Slowest',
  busiest: 'Busiest',
}

export const ENDPOINT_ROWS = 8

export function formatDuration(ms: number): string {
  return ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1)} s`
}

export function formatPercentPoints(value: number): string {
  return `${value.toFixed(value >= 10 ? 0 : 1)}%`
}

export function formatUptime(hours: number): string {
  const days = Math.floor(hours / 24)
  const rest = Math.round(hours % 24)
  return days > 0 ? `${days}d ${rest}h` : `${Math.round(hours)}h`
}

export function formatSampleTime(at: string, range: PerformanceRangeId): string {
  const date = new Date(at)
  return range === 'day'
    ? date.toLocaleTimeString([], { hour: 'numeric' })
    : date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        ...(range === 'live' ? { second: '2-digit' } : {}),
      })
}

/** Findings ordered worst-first, each a threshold on a value shown elsewhere. */
export function analyseCpu(
  sample: PerformanceSample,
  cores: CpuCore[],
  processes: ProcessLoad[],
): CpuFinding[] {
  const busy = cpuBusy(sample)
  const findings: CpuFinding[] = []

  const hottest = [...cores].sort((a, b) => b.usagePercent - a.usagePercent)[0]
  const saturated = cores.filter((core) => core.usagePercent >= CPU_CRITICAL_PERCENT)
  const top = [...processes].sort((a, b) => b.cpuPercent - a.cpuPercent)[0]

  if (saturated.length > 0 && hottest) {
    findings.push({
      id: 'saturated-cores',
      state: saturated.length > cores.length / 2 ? 'critical' : 'strained',
      title: `${saturated.length} of ${cores.length} cores are pinned above ${CPU_CRITICAL_PERCENT}%`,
      detail: `Core ${hottest.id} is at ${Math.round(hottest.usagePercent)}%. Work queued behind a pinned core shows up as the slow tail, not as an error.`,
    })
  }

  if (sample.cpuIoWait >= 10) {
    findings.push({
      id: 'io-wait',
      state: sample.cpuIoWait >= 14 ? 'critical' : 'strained',
      title: `Cores spent ${formatPercentPoints(sample.cpuIoWait)} of capacity waiting on I/O`,
      detail:
        'That time is the database or disk answering, not CARES code. Adding CPU will not help; a slow query or an unindexed read will.',
    })
  }

  if (top && busy > 0 && top.cpuPercent / busy >= 0.35) {
    findings.push({
      id: 'dominant-process',
      state: top.cpuPercent / busy >= 0.5 ? 'strained' : 'healthy',
      title: `${top.name} is holding ${Math.round((top.cpuPercent / busy) * 100)}% of all busy CPU`,
      detail: `It belongs to ${PROCESS_OWNER_LABELS[top.owner]}. If this is steady rather than a burst, that workload is the one to move onto its own host.`,
    })
  }

  if (responseHealth(sample.responseP95Ms) !== 'healthy' && busy < CPU_STRAINED_PERCENT) {
    findings.push({
      id: 'slow-while-idle',
      state: 'strained',
      title: 'Requests are slow while the host still has headroom',
      detail: `The slow tail is at ${formatDuration(sample.responseP95Ms)} with CPU only ${Math.round(busy)}% busy — look at waiting, not capacity: the endpoint table below points at where.`,
    })
  }

  if (findings.length === 0) {
    findings.push({
      id: 'healthy',
      state: 'healthy',
      title: `Load is spread evenly with ${Math.round(100 - busy)}% headroom`,
      detail: `No core is above ${CPU_CRITICAL_PERCENT}%, I/O wait is low, and the slow tail is inside the ${RESPONSE_STRAINED_MS} ms budget.`,
    })
  }

  return findings
}

export type PageLoadPhase = 'ttfb' | 'dom' | 'interactive'

export const PAGE_PHASE_ORDER: PageLoadPhase[] = ['ttfb', 'dom', 'interactive']

export const PAGE_PHASE_LABELS: Record<PageLoadPhase, string> = {
  ttfb: 'Server wait',
  dom: 'Markup & styles',
  interactive: 'Scripts & data',
}

export const PAGE_PHASE_HINTS: Record<PageLoadPhase, string> = {
  ttfb: 'Time before the first byte arrives — the API and the network.',
  dom: 'Parsing the document and applying styles.',
  interactive: 'Bundle execution and the first data read, until the screen answers clicks.',
}

export const PAGE_PHASE_COLOR: Record<PageLoadPhase, string> = {
  ttfb: CPU_BAND_COLOR.user,
  dom: CPU_BAND_COLOR.ioWait,
  interactive: CPU_BAND_COLOR.system,
}

export const PAGE_INTERACTIVE_BUDGET_MS = 1_500

/** Durations, not the browser's cumulative marks. */
export function pagePhaseDurations(page: {
  ttfbMs: number
  domReadyMs: number
  interactiveMs: number
}): Record<PageLoadPhase, number> {
  return {
    ttfb: page.ttfbMs,
    dom: Math.max(0, page.domReadyMs - page.ttfbMs),
    interactive: Math.max(0, page.interactiveMs - page.domReadyMs),
  }
}
