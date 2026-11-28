import dayjs from 'dayjs'
import { CPU_CRITICAL_PERCENT, cpuBusy } from '../constants/system-performance'
import { SERVICE_HEALTH_ORDER, SYSTEM_EVENTS_MAX } from '../constants/system-usage'
import type { DiagnosticStatus, SystemDiagnostics } from '../types/system-diagnostics'
import type { PerformanceSample, PerformanceSnapshot } from '../types/system-performance'
import type { ServiceState, SystemService } from '../types/system-service'
import type {
  DailyUsage,
  ServiceHealth,
  ServiceStatusRow,
  SystemEvent,
  SystemHealthSummary,
} from '../types/system-usage'

const round1 = (n: number) => Math.round(n * 10) / 10
const DAY_MS = 24 * 60 * 60 * 1000

/** Peak includes 3 s ticks, since bucket averages smooth spikes away. */
export function lastDayUsage(
  snapshot: PerformanceSnapshot | null,
  liveSample: PerformanceSample | null,
  livePeak: { value: number; at: string } | null,
): DailyUsage | null {
  const busy = (snapshot?.samples ?? []).map(cpuBusy)
  if (liveSample) busy.push(cpuBusy(liveSample))
  if (busy.length === 0) return null
  const recentPeak = livePeak && Date.now() - dayjs(livePeak.at).valueOf() < DAY_MS ? livePeak.value : 0
  return {
    date: dayjs().format('YYYY-MM-DD'),
    cpuAvg: round1(busy.reduce((s, v) => s + v, 0) / busy.length),
    cpuPeak: round1(Math.max(recentPeak, ...busy)),
    sample: false,
  }
}

const PROBE_HEALTH: Record<DiagnosticStatus, ServiceHealth> = {
  ok: 'operational',
  warn: 'degraded',
  fail: 'down',
}

/** Failing schedulers are still retrying: degraded, not down. */
const SCHEDULER_HEALTH: Record<ServiceState, ServiceHealth> = {
  running: 'operational',
  scheduled: 'operational',
  failing: 'degraded',
  paused: 'paused',
}

function successRate(service: SystemService): number | null {
  const finished = service.recentRuns.filter((r) => r.outcome !== 'running')
  if (finished.length === 0) return null
  return (finished.filter((r) => r.outcome === 'success').length / finished.length) * 100
}

/** Scheduler probes are dropped in favour of the roster, which knows more. */
export function serviceRows(
  diagnostics: SystemDiagnostics | null,
  services: SystemService[],
): ServiceStatusRow[] {
  const report = diagnostics?.report
  const probes: ServiceStatusRow[] = (report?.checks ?? [])
    .filter((check) => check.group !== 'scheduler')
    .map((check) => ({
      id: `probe:${check.id}`,
      name: check.name,
      kind: check.group,
      health: PROBE_HEALTH[check.status],
      timing: check.latencyMs === null ? null : { label: 'Probe', ms: check.latencyMs },
      successRate: null,
      lastActivityAt: report?.checkedAt ?? null,
      note: check.status === 'ok' ? null : check.detail,
    }))

  const schedulers: ServiceStatusRow[] = services.map((service) => ({
    id: `scheduler:${service.id}`,
    name: service.name,
    kind: 'scheduler',
    health: SCHEDULER_HEALTH[service.state],
    timing: service.averageRuntimeSeconds
      ? { label: 'Avg run', ms: service.averageRuntimeSeconds * 1000 }
      : null,
    successRate: successRate(service),
    lastActivityAt: service.lastRunAt,
    note: service.state === 'failing' ? service.lastError : null,
  }))

  const rank = (h: ServiceHealth) =>
    h === 'down' ? 0 : h === 'degraded' ? 1 : h === 'operational' ? 2 : 3
  return [...probes, ...schedulers].sort(
    (a, b) => rank(a.health) - rank(b.health) || a.name.localeCompare(b.name),
  )
}

export function healthCounts(rows: ServiceStatusRow[]): Record<ServiceHealth, number> {
  return Object.fromEntries(
    SERVICE_HEALTH_ORDER.map((h) => [h, rows.filter((r) => r.health === h).length]),
  ) as Record<ServiceHealth, number>
}

export function systemHealth(diagnostics: SystemDiagnostics | null): SystemHealthSummary {
  const history = diagnostics?.history ?? []
  return {
    overall: diagnostics?.report?.overall ?? null,
    checkedAt: diagnostics?.report?.checkedAt ?? null,
    healthyPercent: history.length
      ? (history.filter((h) => h.overall === 'healthy').length / history.length) * 100
      : null,
    sweeps: history.length,
  }
}

/** Consecutive readings of one episode fold into a single entry. */
export function deriveEvents(
  snapshot: PerformanceSnapshot | null,
  diagnostics: SystemDiagnostics | null,
  services: SystemService[],
): SystemEvent[] {
  const events: SystemEvent[] = []

  const pushSpike = (spike: { at: string; max: number }) =>
    events.push({
      id: `cpu:${spike.at}`,
      at: spike.at,
      severity: 'critical',
      title: `CPU reached ${Math.round(spike.max)}% (above ${CPU_CRITICAL_PERCENT}%)`,
      source: 'Host',
    })
  let spike: { at: string; max: number } | null = null
  for (const sample of snapshot?.samples ?? []) {
    const busy = cpuBusy(sample)
    if (busy >= CPU_CRITICAL_PERCENT) {
      spike = spike ? { at: spike.at, max: Math.max(spike.max, busy) } : { at: sample.at, max: busy }
    } else if (spike) {
      pushSpike(spike)
      spike = null
    }
  }
  if (spike) pushSpike(spike)

  type Episode = { at: string; overall: string; failing: number }
  const pushEpisode = (episode: Episode) =>
    events.push({
      id: `sweep:${episode.at}`,
      at: episode.at,
      severity: episode.overall === 'down' ? 'critical' : 'warning',
      title: `System ${episode.overall} — ${episode.failing} check${episode.failing === 1 ? '' : 's'} failing`,
      source: 'Diagnostics',
    })
  let episode: Episode | null = null
  for (const sweep of diagnostics?.history ?? []) {
    if (episode && episode.overall === sweep.overall) {
      episode = {
        at: episode.at,
        overall: episode.overall,
        failing: Math.max(episode.failing, sweep.failing),
      }
      continue
    }
    if (episode) pushEpisode(episode)
    episode =
      sweep.overall === 'healthy'
        ? null
        : { at: sweep.checkedAt, overall: sweep.overall, failing: sweep.failing }
  }
  if (episode) pushEpisode(episode)

  const report = diagnostics?.report
  for (const check of report?.checks ?? []) {
    if (check.status === 'ok' || check.group === 'scheduler') continue
    events.push({
      id: `probe:${check.id}:${report?.checkedAt}`,
      at: report?.checkedAt ?? new Date().toISOString(),
      severity: check.status === 'fail' ? 'critical' : 'warning',
      title: `${check.name}: ${check.detail}`,
      source: 'Diagnostics',
    })
  }

  for (const service of services) {
    for (const run of service.recentRuns) {
      if (run.outcome !== 'failed' && run.outcome !== 'timed_out') continue
      events.push({
        id: `run:${service.id}:${run.id}`,
        at: run.startedAt,
        severity: run.outcome === 'failed' ? 'critical' : 'warning',
        title:
          run.outcome === 'failed'
            ? `${service.name} run failed`
            : `${service.name} run timed out after ${Math.round(run.durationSeconds / 60)} min`,
        source: service.name,
      })
    }
    if (service.state === 'paused') {
      events.push({
        id: `paused:${service.id}`,
        at: service.lastRunAt ?? new Date().toISOString(),
        severity: 'info',
        title: `${service.name} is paused`,
        source: service.name,
      })
    }
  }

  return events.sort((a, b) => b.at.localeCompare(a.at)).slice(0, SYSTEM_EVENTS_MAX)
}
