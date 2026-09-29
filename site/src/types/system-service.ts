/**
 * The scheduler services that keep CARES running between staff sessions — the
 * attendance flusher, the certificate dispatcher, the report compiler. They are
 * meant to sit on duty 24/7, so the portal's job is to show whether each one is
 * still on duty and to give staff the two knobs that matter: when it fires
 * (trigger) and how long it may run (duration).
 */

/** Where a service sits in its cycle right now. */
export type ServiceState =
  /** Executing a run at this moment. */
  | 'running'
  /** On duty and waiting for its next trigger. */
  | 'scheduled'
  /** Switched off by staff — it will not fire until it is resumed. */
  | 'paused'
  /** On duty, but its last run ended in an error or hit the runtime cap. */
  | 'failing'

/** How a service decides to fire. */
export type ServiceTriggerMode =
  /** Every N minutes, around the clock. */
  | 'interval'
  /** Once a day at a fixed local time. */
  | 'daily'
  /** A cron expression, for anything the two simple modes cannot say. */
  | 'cron'
  /** Never fires on its own — staff run it by hand. */
  | 'manual'

/** What the scheduler does when a run is still going and the next trigger arrives. */
export type ServiceOverlapPolicy = 'skip' | 'queue'

export interface ServiceTrigger {
  mode: ServiceTriggerMode
  /** Minutes between runs — `interval` only. */
  intervalMinutes: number
  /** Local 24h time `HH:mm` — `daily` only. */
  dailyAt: string
  /** Raw expression — `cron` only. */
  cronExpression: string
}

export interface ServiceDuration {
  /** Hard cap on one run. A run still going at this point is killed and marked failed. */
  maxRuntimeMinutes: number
  /** Retries after a failed or timed-out run, before the service is flagged failing. */
  retries: number
  overlapPolicy: ServiceOverlapPolicy
}

export interface ServiceRun {
  id: string
  startedAt: string
  /** Seconds the run took — the in-flight run reports what it has spent so far. */
  durationSeconds: number
  outcome: 'success' | 'failed' | 'timed_out' | 'running'
}

export interface SystemService {
  id: string
  name: string
  /** One line on what the job actually does, in staff language. */
  description: string
  /** Which deployable owns the worker — shown so staff know where to look on failure. */
  owner: 'server' | 'microservices' | 'mobile-sync'
  state: ServiceState
  trigger: ServiceTrigger
  duration: ServiceDuration
  /** Median seconds across recent runs — the bar's expected length. */
  averageRuntimeSeconds: number
  lastRunAt: string | null
  nextRunAt: string | null
  /** Set while `state` is `running`; drives the live elapsed bar. */
  currentRunStartedAt: string | null
  /** Consecutive days the service has stayed on duty without being paused. */
  onDutyDays: number
  /** Most recent runs, oldest first — the strip of ticks under each service. */
  recentRuns: ServiceRun[]
  /** Present when the last run failed; the reason staff need before retrying. */
  lastError: string | null
}

export interface SystemServiceCounts {
  total: number
  running: number
  scheduled: number
  paused: number
  failing: number
}

/** Severity of one line in a scheduler's log. */
export type ServiceLogLevel = 'info' | 'warn' | 'error'

export interface ServiceLogEntry {
  id: string
  /** Which run wrote the line — the viewer groups by this. */
  runId: string
  at: string
  level: ServiceLogLevel
  message: string
}
