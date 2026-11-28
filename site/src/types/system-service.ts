export type ServiceState =
  | 'running'
  | 'scheduled'
  | 'paused'
  /** On duty, but the last run errored or hit the runtime cap. */
  | 'failing'

export type ServiceTriggerMode =
  | 'interval'
  /** Once a day at a fixed local time. */
  | 'daily'
  | 'cron'
  | 'manual'

/** What happens when a run is still going at the next trigger. */
export type ServiceOverlapPolicy = 'skip' | 'queue'

export interface ServiceTrigger {
  mode: ServiceTriggerMode
  /** `interval` only. */
  intervalMinutes: number
  /** Local `HH:mm`; `daily` only. */
  dailyAt: string
  /** `cron` only. */
  cronExpression: string
}

export interface ServiceDuration {
  /** A run still going at the cap is killed and marked failed. */
  maxRuntimeMinutes: number
  /** Before the service is flagged failing. */
  retries: number
  overlapPolicy: ServiceOverlapPolicy
}

export interface ServiceRun {
  id: string
  startedAt: string
  /** In-flight runs report time spent so far. */
  durationSeconds: number
  outcome: 'success' | 'failed' | 'timed_out' | 'running'
}

export interface SystemService {
  id: string
  name: string
  description: string
  owner: 'server' | 'microservices' | 'mobile-sync'
  state: ServiceState
  trigger: ServiceTrigger
  duration: ServiceDuration
  /** Median across recent runs. */
  averageRuntimeSeconds: number
  lastRunAt: string | null
  nextRunAt: string | null
  /** Set while `running`. */
  currentRunStartedAt: string | null
  onDutyDays: number
  /** Oldest first. */
  recentRuns: ServiceRun[]
  lastError: string | null
}

export interface SystemServiceCounts {
  total: number
  running: number
  scheduled: number
  paused: number
  failing: number
}

export type ServiceLogLevel = 'info' | 'warn' | 'error'

export interface ServiceLogEntry {
  id: string
  runId: string
  at: string
  level: ServiceLogLevel
  message: string
}
