import { MOCK_API_DELAY_MS, delay } from '../constants/durations'
import type {
  ServiceDuration,
  ServiceLogEntry,
  ServiceTrigger,
  SystemService,
} from '../types/system-service'
import { buildMockServiceLogs, buildMockSystemServices } from './mock-data'

/**
 * The scheduler control endpoints are not built yet, so this module serves the
 * fixture roster and keeps every control in memory. Swap each function for an
 * `apiClient` call — the signatures already match what the endpoint will return.
 */
let services: SystemService[] = buildMockSystemServices()

/** The log the worker wrote for its recent runs, newest line last. */
export async function fetchServiceLogs(id: string): Promise<ServiceLogEntry[]> {
  await delay(MOCK_API_DELAY_MS.default)

  const service = services.find((one) => one.id === id)
  return service ? buildMockServiceLogs(service) : []
}

export async function fetchSystemServices(): Promise<SystemService[]> {
  await delay(MOCK_API_DELAY_MS.default)
  return structuredClone(services)
}

function replace(id: string, patch: (service: SystemService) => SystemService) {
  services = services.map((service) => (service.id === id ? patch(service) : service))
  return structuredClone(services)
}

/** The 24/7 switch: pausing clears the next trigger, resuming re-arms it. */
export async function setServicePaused(
  id: string,
  paused: boolean,
): Promise<SystemService[]> {
  await delay(MOCK_API_DELAY_MS.default)

  return replace(id, (service) => ({
    ...service,
    state: paused ? 'paused' : 'scheduled',
    onDutyDays: paused ? 0 : service.onDutyDays,
    nextRunAt: paused
      ? null
      : new Date(
          Date.now() + service.trigger.intervalMinutes * 60 * 1000,
        ).toISOString(),
  }))
}

/** Fires a run outside the schedule; the next trigger is left where it was. */
export async function triggerServiceRun(id: string): Promise<SystemService[]> {
  await delay(MOCK_API_DELAY_MS.default)

  const startedAt = new Date().toISOString()

  return replace(id, (service) => ({
    ...service,
    state: 'running',
    lastRunAt: startedAt,
    currentRunStartedAt: startedAt,
    lastError: null,
    recentRuns: [
      ...service.recentRuns.slice(1),
      {
        id: `${service.id}-run-manual-${service.recentRuns.length + 1}`,
        startedAt,
        durationSeconds: 0,
        outcome: 'running',
      },
    ],
  }))
}

/** Stops the run in flight — the scheduler stays on duty for the next trigger. */
export async function stopServiceRun(id: string): Promise<SystemService[]> {
  await delay(MOCK_API_DELAY_MS.default)

  return replace(id, (service) => ({
    ...service,
    state: 'scheduled',
    currentRunStartedAt: null,
    recentRuns: service.recentRuns.map((run, index) =>
      index === service.recentRuns.length - 1 && run.outcome === 'running'
        ? { ...run, outcome: 'failed' }
        : run,
    ),
  }))
}

export interface ServiceScheduleUpdate {
  trigger: ServiceTrigger
  duration: ServiceDuration
}

export async function updateServiceSchedule(
  id: string,
  update: ServiceScheduleUpdate,
): Promise<SystemService[]> {
  await delay(MOCK_API_DELAY_MS.default)

  return replace(id, (service) => ({
    ...service,
    trigger: update.trigger,
    duration: update.duration,
    // A manual-only service has nothing to count down to any more.
    nextRunAt:
      update.trigger.mode === 'manual' || service.state === 'paused'
        ? null
        : new Date(
            Date.now() + update.trigger.intervalMinutes * 60 * 1000,
          ).toISOString(),
  }))
}
