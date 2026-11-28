import type {
  ServiceLogLevel,
  ServiceOverlapPolicy,
  ServiceRun,
  ServiceState,
  ServiceTrigger,
  ServiceTriggerMode,
} from '../types/system-service'

export const SERVICE_POLL_INTERVAL_MS = 15_000

export const SERVICE_STATE_FILTER_ALL = 'all'

export type ServiceStateFilter = ServiceState | typeof SERVICE_STATE_FILTER_ALL

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

export const SERVICE_STATE_HINTS: Record<ServiceState, string> = {
  running: 'Executing a run right now.',
  scheduled: 'On duty and waiting for its next trigger.',
  paused: 'Switched off by staff — it will not fire until resumed.',
  failing: 'Last run errored or hit its runtime cap.',
}

export const SERVICE_STATE_STYLES: Record<ServiceState, string> = {
  running: 'bg-emerald-50 text-emerald-700',
  scheduled: 'bg-gray-100 text-gray-600',
  paused: 'bg-amber-50 text-amber-700',
  failing: 'bg-red-50 text-red-700',
}

export const SERVICE_STATE_DOT_STYLES: Record<ServiceState, string> = {
  running: 'bg-emerald-500',
  scheduled: 'bg-gray-400',
  paused: 'bg-amber-500',
  failing: 'bg-red-500',
}

export const SERVICE_STATE_BAR_STYLES: Record<ServiceState, string> = {
  running: 'bg-emerald-500',
  scheduled: 'bg-emerald-200',
  paused: 'bg-amber-400',
  failing: 'bg-red-500',
}

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

export const SERVICE_TRIGGER_MODES: ServiceTriggerMode[] = [
  'interval',
  'daily',
  'cron',
  'manual',
]

export const SERVICE_INTERVAL_PRESETS = [5, 10, 15, 30, 60, 180, 360, 720] as const

/** Six-field expressions lead with seconds; the scheduler accepts both. `custom` unlocks the raw expression. */
export const SERVICE_CRON_CUSTOM = 'custom' as const

export const SERVICE_CRON_PRESETS: { label: string; expression: string }[] = [
  { label: 'Every 30 seconds', expression: '*/30 * * * * *' },
  { label: 'Every minute', expression: '* * * * *' },
  { label: 'Every 5 minutes', expression: '*/5 * * * *' },
  { label: 'Every 15 minutes', expression: '*/15 * * * *' },
  { label: 'Every 30 minutes', expression: '*/30 * * * *' },
  { label: 'Every hour', expression: '0 * * * *' },
  { label: 'Every 6 hours', expression: '0 */6 * * *' },
  { label: 'Daily at midnight', expression: '0 0 * * *' },
  { label: 'Weekdays at 8:00 AM', expression: '0 8 * * 1-5' },
  { label: 'Sundays at 3:00 AM', expression: '0 3 * * 0' },
  { label: 'First of the month at midnight', expression: '0 0 1 * *' },
]

export function cronPresetFor(expression: string): string {
  const trimmed = expression.trim().replace(/\s+/g, ' ')
  return (
    SERVICE_CRON_PRESETS.find((preset) => preset.expression === trimmed)?.expression ??
    SERVICE_CRON_CUSTOM
  )
}

/** Five fields (minute first) or six (seconds first). */
export function isValidCronShape(expression: string): boolean {
  const fields = expression.trim().split(/\s+/).length
  return fields === 5 || fields === 6
}

/** Minutes; a run still going at the cap is killed. */
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

export function describeTrigger(trigger: ServiceTrigger): string {
  switch (trigger.mode) {
    case 'interval':
      return trigger.intervalMinutes >= 60 && trigger.intervalMinutes % 60 === 0
        ? `Every ${trigger.intervalMinutes / 60} h`
        : `Every ${trigger.intervalMinutes} min`
    case 'daily':
      return `Daily at ${trigger.dailyAt}`
    case 'cron': {
      const preset = SERVICE_CRON_PRESETS.find(
        (one) => one.expression === trigger.cronExpression.trim().replace(/\s+/g, ' '),
      )
      return preset ? preset.label : `Cron ${trigger.cronExpression}`
    }
    case 'manual':
      return 'Manual only'
  }
}

export function formatRuntime(seconds: number): string {
  if (seconds > 0 && seconds < 1) return `${seconds.toFixed(1)}s`
  if (seconds < 60) return `${Math.round(seconds)}s`
  const minutes = Math.floor(seconds / 60)
  const rest = Math.round(seconds % 60)
  return rest === 0 ? `${minutes}m` : `${minutes}m ${rest}s`
}

/** `now` is passed in so the caller renders from its own clock tick. */
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
