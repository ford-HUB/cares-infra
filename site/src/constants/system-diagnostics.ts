import type {
  DiagnosticGroup,
  DiagnosticOverall,
  DiagnosticStatus,
} from '../types/system-diagnostics'

/** How often the diagnostics card re-reads the last sweep while the page is open. */
export const DIAGNOSTICS_POLL_INTERVAL_MS = 15_000

/** Draw order of the groups on the diagnostics card — the stack, top down. */
export const DIAGNOSTIC_GROUP_ORDER: DiagnosticGroup[] = [
  'database',
  'cache',
  'queue',
  'scheduler',
  'microservice',
  'process',
]

export const DIAGNOSTIC_GROUP_LABELS: Record<DiagnosticGroup, string> = {
  database: 'Database',
  cache: 'Redis',
  queue: 'Queues & workers',
  scheduler: 'Schedulers',
  microservice: 'ML services',
  process: 'API process',
}

export const DIAGNOSTIC_STATUS_LABELS: Record<DiagnosticStatus, string> = {
  ok: 'OK',
  warn: 'Warning',
  fail: 'Failing',
}

/** Dot colour beside each check — the only place a check is coloured. */
export const DIAGNOSTIC_STATUS_DOT_STYLES: Record<DiagnosticStatus, string> = {
  ok: 'bg-emerald-500',
  warn: 'bg-amber-500',
  fail: 'bg-red-500',
}

export const DIAGNOSTIC_STATUS_TEXT_STYLES: Record<DiagnosticStatus, string> = {
  ok: 'text-gray-500',
  warn: 'text-amber-700',
  fail: 'text-red-700',
}

export const DIAGNOSTIC_OVERALL_LABELS: Record<DiagnosticOverall, string> = {
  healthy: 'All clear',
  degraded: 'Degraded',
  down: 'Down',
}

export const DIAGNOSTIC_OVERALL_STYLES: Record<DiagnosticOverall, string> = {
  healthy: 'bg-emerald-50 text-emerald-700',
  degraded: 'bg-amber-50 text-amber-700',
  down: 'bg-red-50 text-red-700',
}

/** Tick colour in the strip of past sweeps. */
export const DIAGNOSTIC_OVERALL_TICK_STYLES: Record<DiagnosticOverall, string> = {
  healthy: 'bg-emerald-400',
  degraded: 'bg-amber-400',
  down: 'bg-red-400',
}

/** What each group covers — the card subtitles. */
export const DIAGNOSTIC_GROUP_HINTS: Record<DiagnosticGroup, string> = {
  database: 'Postgres answering a query.',
  cache: 'Sessions, OTPs and the queues all live here.',
  queue: 'Each queue needs a worker attached and no backlog.',
  scheduler: 'Every catalogued job, armed and firing on time.',
  microservice: 'The Python services behind registration and matching.',
  process: 'The API process itself — its thread and its memory.',
}

/** `just now`, `40s ago`, `3 min ago` — how stale the report on screen is. */
export function formatSweepAgo(iso: string, now: number): string {
  const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000))
  if (seconds < 5) return 'just now'
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  return `${Math.floor(minutes / 60)} h ago`
}
