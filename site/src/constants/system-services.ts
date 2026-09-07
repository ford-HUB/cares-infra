import type {
  ServiceLogLevel,
  ServiceOverlapPolicy,
  ServiceRun,
  ServiceState,
  ServiceTrigger,
  ServiceTriggerMode,
} from '../types/system-service'

/** How often the page re-reads service state while it is open. */
export const SERVICE_POLL_INTERVAL_MS = 15_000

export const SERVICE_STATE_FILTER_ALL = 'all'

export type ServiceStateFilter = ServiceState | typeof SERVICE_STATE_FILTER_ALL

/** Order the states are drawn in, best news first — also the bar's segment order. */
export const SERVICE_STATE_ORDER: ServiceState[] = [
  'running',
  'scheduled',
  'paused',
  'failing',
]

export const SERVICE_STATE_LABELS: Record<ServiceState, string> = {
  running: 'Running',
  scheduled: 'On Duty',
  paused: 'Paused',
  failing: 'Failing',
}

/** What each state means for the reader — the segment tooltips. */
export const SERVICE_STATE_HINTS: Record<ServiceState, string> = {
  running: 'Executing a run right now.',
  scheduled: 'On duty and waiting for its next trigger.',
  paused: 'Switched off by staff — it will not fire until resumed.',
  failing: 'Last run errored or hit its runtime cap.',
}

/** Light-only palette, in step with the rest of the portal's badges. */
export const SERVICE_STATE_STYLES: Record<ServiceState, string> = {
  running: 'bg-emerald-50 text-emerald-700',
  scheduled: 'bg-gray-100 text-gray-600',
  paused: 'bg-amber-50 text-amber-700',
  failing: 'bg-red-50 text-red-700',
}

/** Dot colour inside the badge; `running` is the only one that animates. */
export const SERVICE_STATE_DOT_STYLES: Record<ServiceState, string> = {
  running: 'bg-emerald-500',
  scheduled: 'bg-gray-400',
  paused: 'bg-amber-500',
  failing: 'bg-red-500',
}

/** Segment fill in the duty bar. */
export const SERVICE_STATE_BAR_STYLES: Record<ServiceState, string> = {
  running: 'bg-emerald-500',
  scheduled: 'bg-emerald-200',
  paused: 'bg-amber-400',
  failing: 'bg-red-500',
}

/** Tick colour in a service's run history strip. */
export const SERVICE_RUN_STYLES: Record<ServiceRun['outcome'], string> = {
  success: 'bg-emerald-400',
  failed: 'bg-red-400',
  timed_out: 'bg-amber-400',
  running: 'bg-emerald-500 animate-pulse',
}

export const SERVICE_RUN_LABELS: Record<ServiceRun['outcome'], string> = {
  success: 'Completed',
  failed: 'Failed',
  timed_out: 'Timed out',
  running: 'In progress',
}

export const SERVICE_TRIGGER_LABELS: Record<ServiceTriggerMode, string> = {
  interval: 'Every',
  daily: 'Daily at',
  cron: 'Cron',
  manual: 'Manual only',
}

/** The trigger modes offered in the schedule dialog, in the order they are shown. */
export const SERVICE_TRIGGER_MODES: ServiceTriggerMode[] = [
  'interval',
  'daily',
  'cron',
  'manual',
]

/** Interval choices staff pick from — a free-text minutes field invites typos. */
export const SERVICE_INTERVAL_PRESETS = [5, 10, 15, 30, 60, 180, 360, 720] as const

/** Runtime caps, in minutes. A run still going at the cap is killed. */
export const SERVICE_RUNTIME_PRESETS = [1, 2, 5, 10, 15, 30, 60] as const

export const SERVICE_RETRY_PRESETS = [0, 1, 2, 3] as const

export const SERVICE_OVERLAP_LABELS: Record<ServiceOverlapPolicy, string> = {
  skip: 'Skip the trigger',
  queue: 'Queue the run',
}

export const SERVICE_OVERLAP_HINTS: Record<ServiceOverlapPolicy, string> = {
  skip: 'Drop the new trigger if the previous run is still going.',
  queue: 'Hold the trigger and start it as soon as the run finishes.',
}

export const SERVICE_OWNER_LABELS: Record<string, string> = {
  server: 'NestJS API',
  microservices: 'Python ML',
  'mobile-sync': 'Mobile sync',
}

/** One line summarising a trigger, used on the service row. */
export function describeTrigger(trigger: ServiceTrigger): string {
  switch (trigger.mode) {
    case 'interval':
      return trigger.intervalMinutes >= 60 && trigger.intervalMinutes % 60 === 0
        ? `Every ${trigger.intervalMinutes / 60} h`
        : `Every ${trigger.intervalMinutes} min`
    case 'daily':
      return `Daily at ${trigger.dailyAt}`
    case 'cron':
      return `Cron ${trigger.cronExpression}`
    case 'manual':
      return 'Manual only'
  }
}

/** Compact run length — seconds under a minute, `m s` above it. */
export function formatRuntime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`
  const minutes = Math.floor(seconds / 60)
  const rest = Math.round(seconds % 60)
  return rest === 0 ? `${minutes}m` : `${minutes}m ${rest}s`
}

/**
 * How long until a timestamp, as a countdown staff can read at a glance. `now` is
 * passed in rather than read here so the caller renders from its own clock tick.
 */
export function formatCountdown(target: string | null, now: number): string {
  if (!target) return '—'
  const ms = new Date(target).getTime() - now
  if (ms <= 0) return 'due now'
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 1) return `in ${Math.max(1, Math.round(ms / 1000))}s`
  if (minutes < 60) return `in ${minutes}m`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `in ${hours}h` : `in ${hours}h ${rest}m`
}

export const SERVICE_LOG_LEVEL_FILTER_ALL = 'all'

export type ServiceLogLevelFilter =
  | ServiceLogLevel
  | typeof SERVICE_LOG_LEVEL_FILTER_ALL

export const SERVICE_LOG_LEVEL_ORDER: ServiceLogLevel[] = ['info', 'warn', 'error']

export const SERVICE_LOG_LEVEL_LABELS: Record<ServiceLogLevel, string> = {
  info: 'Info',
  warn: 'Warning',
  error: 'Error',
}

/** Only the two levels staff act on carry colour; info stays inert. */
export const SERVICE_LOG_LEVEL_STYLES: Record<ServiceLogLevel, string> = {
  info: 'text-gray-500',
  warn: 'text-amber-700',
  error: 'text-red-700',
}

export const SERVICE_LOG_LEVEL_ROW_STYLES: Record<ServiceLogLevel, string> = {
  info: '',
  warn: 'bg-amber-50/60',
  error: 'bg-red-50/60',
}
