import type {
  ServiceDuration,
  ServiceLogEntry,
  ServiceTrigger,
  SystemService,
} from '../types/system-service'
import { apiClient, parseApiError } from './api-client'

/**
 * The scheduler control plane on the server: BullMQ job schedulers, joined with the
 * run history the workers record. Every control returns the whole roster after the
 * change, so the store swaps rather than patches. Failures throw with the server's
 * message — the store turns that into the toast.
 */

interface ServiceTriggerApiResponse {
  mode: ServiceTrigger['mode']
  interval_minutes: number
  daily_at: string
  cron_expression: string
}

interface ServiceDurationApiResponse {
  max_runtime_minutes: number
  retries: number
  overlap_policy: ServiceDuration['overlapPolicy']
}

interface ServiceRunApiResponse {
  id: string
  started_at: string
  duration_seconds: number
  outcome: SystemService['recentRuns'][number]['outcome']
}

interface SystemServiceApiResponse {
  id: string
  name: string
  description: string
  owner: SystemService['owner']
  state: SystemService['state']
  trigger: ServiceTriggerApiResponse
  duration: ServiceDurationApiResponse
  average_runtime_seconds: number
  last_run_at: string | null
  next_run_at: string | null
  current_run_started_at: string | null
  on_duty_days: number
  recent_runs: ServiceRunApiResponse[]
  last_error: string | null
}

interface ServiceLogEntryApiResponse {
  id: string
  run_id: string
  at: string
  level: ServiceLogEntry['level']
  message: string
}

function mapApiService(data: SystemServiceApiResponse): SystemService {
  return {
    id: data.id,
    name: data.name,
    description: data.description,
    owner: data.owner,
    state: data.state,
    trigger: {
      mode: data.trigger.mode,
      intervalMinutes: data.trigger.interval_minutes,
      dailyAt: data.trigger.daily_at,
      cronExpression: data.trigger.cron_expression,
    },
    duration: {
      maxRuntimeMinutes: data.duration.max_runtime_minutes,
      retries: data.duration.retries,
      overlapPolicy: data.duration.overlap_policy,
    },
    averageRuntimeSeconds: data.average_runtime_seconds,
    lastRunAt: data.last_run_at,
    nextRunAt: data.next_run_at,
    currentRunStartedAt: data.current_run_started_at,
    onDutyDays: data.on_duty_days,
    recentRuns: data.recent_runs.map((run) => ({
      id: run.id,
      startedAt: run.started_at,
      durationSeconds: run.duration_seconds,
      outcome: run.outcome,
    })),
    lastError: data.last_error,
  }
}

async function rosterRequest(
  request: () => Promise<{ data: { ok: true; data: SystemServiceApiResponse[] } }>,
): Promise<SystemService[]> {
  try {
    const { data: body } = await request()
    return body.data.map(mapApiService)
  } catch (error) {
    throw new Error(parseApiError(error), { cause: error })
  }
}

export function fetchSystemServices(): Promise<SystemService[]> {
  return rosterRequest(() => apiClient.get('/api/v1/system-services'))
}

/** The log the worker wrote for its recent runs, newest line last. */
export async function fetchServiceLogs(id: string): Promise<ServiceLogEntry[]> {
  try {
    const { data: body } = await apiClient.get<{
      ok: true
      data: ServiceLogEntryApiResponse[]
    }>(`/api/v1/system-services/${id}/logs`)
    return body.data.map((line) => ({
      id: line.id,
      runId: line.run_id,
      at: line.at,
      level: line.level,
      message: line.message,
    }))
  } catch (error) {
    throw new Error(parseApiError(error), { cause: error })
  }
}

/** The 24/7 switch: pausing removes the trigger, resuming re-arms it. */
export function setServicePaused(id: string, paused: boolean): Promise<SystemService[]> {
  return rosterRequest(() =>
    apiClient.patch(`/api/v1/system-services/${id}/paused`, { paused }),
  )
}

/** Fires a run outside the schedule; the next trigger is left where it was. */
export function triggerServiceRun(id: string): Promise<SystemService[]> {
  return rosterRequest(() => apiClient.post(`/api/v1/system-services/${id}/run`))
}

/** Cancels a queued manual run; a run already executing cannot be interrupted. */
export function stopServiceRun(id: string): Promise<SystemService[]> {
  return rosterRequest(() => apiClient.post(`/api/v1/system-services/${id}/stop`))
}

export interface ServiceScheduleUpdate {
  trigger: ServiceTrigger
  duration: ServiceDuration
}

export function updateServiceSchedule(
  id: string,
  update: ServiceScheduleUpdate,
): Promise<SystemService[]> {
  return rosterRequest(() =>
    apiClient.patch(`/api/v1/system-services/${id}/schedule`, {
      trigger: {
        mode: update.trigger.mode,
        interval_minutes: update.trigger.intervalMinutes,
        daily_at: update.trigger.dailyAt,
        cron_expression: update.trigger.cronExpression,
      },
      duration: {
        max_runtime_minutes: update.duration.maxRuntimeMinutes,
        retries: update.duration.retries,
        overlap_policy: update.duration.overlapPolicy,
      },
    }),
  )
}
