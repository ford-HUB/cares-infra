import { create } from 'zustand'
import toast from 'react-hot-toast'
import {
  fetchServiceLogs,
  fetchSystemServices,
  setServicePaused,
  stopServiceRun,
  triggerServiceRun,
  updateServiceSchedule,
  type ServiceScheduleUpdate,
} from '../services/system-service-service'
import type { ServiceLogEntry, SystemService } from '../types/system-service'

const RUN_SETTLE_REFRESH_MS = 3000

interface SystemServiceState {
  services: SystemService[]
  initialized: boolean
  error: string | null
  busyId: string | null
  logs: ServiceLogEntry[]
  /** Guards against a stale read landing in another viewer. */
  logsServiceId: string | null
  logsLoading: boolean
  fetchServices: (options?: { silent?: boolean }) => Promise<void>
  fetchLogs: (id: string) => Promise<void>
  togglePaused: (service: SystemService) => Promise<void>
  runNow: (service: SystemService) => Promise<void>
  stopRun: (service: SystemService) => Promise<void>
  saveSchedule: (
    service: SystemService,
    update: ServiceScheduleUpdate,
  ) => Promise<void>
}

async function control(
  set: (partial: Partial<SystemServiceState>) => void,
  id: string,
  action: () => Promise<SystemService[]>,
  done: string,
) {
  set({ busyId: id })
  try {
    set({ services: await action() })
    toast.success(done)
  } catch {
    toast.error('The scheduler did not accept that change.')
  } finally {
    set({ busyId: null })
  }
}

export const useSystemServiceStore = create<SystemServiceState>((set) => ({
  services: [],
  initialized: false,
  error: null,
  busyId: null,
  logs: [],
  logsServiceId: null,
  logsLoading: false,

  fetchServices: async (options) => {
    if (!options?.silent) set({ error: null })
    try {
      set({ services: await fetchSystemServices(), error: null, initialized: true })
    } catch {
      set({
        initialized: true,
        error: 'Could not read the scheduler roster. The control plane may be down.',
      })
    }
  },

  fetchLogs: async (id) => {
    set({ logsServiceId: id, logsLoading: true })
    try {
      const logs = await fetchServiceLogs(id)
      // The viewer may have moved on meanwhile.
      if (useSystemServiceStore.getState().logsServiceId === id) set({ logs })
    } catch {
      set({ logs: [] })
    } finally {
      set({ logsLoading: false })
    }
  },

  togglePaused: async (service) => {
    const pausing = service.state !== 'paused'
    await control(
      set,
      service.id,
      () => setServicePaused(service.id, pausing),
      pausing
        ? `${service.name} paused. It will not fire until resumed.`
        : `${service.name} is back on duty.`,
    )
  },

  runNow: async (service) => {
    await control(
      set,
      service.id,
      () => triggerServiceRun(service.id),
      `${service.name} triggered.`,
    )
    // The response may catch the run in flight; re-read without waiting on the poll.
    window.setTimeout(
      () => void useSystemServiceStore.getState().fetchServices({ silent: true }),
      RUN_SETTLE_REFRESH_MS,
    )
  },

  stopRun: async (service) => {
    await control(
      set,
      service.id,
      () => stopServiceRun(service.id),
      `${service.name} run stopped.`,
    )
  },

  saveSchedule: async (service, update) => {
    await control(
      set,
      service.id,
      () => updateServiceSchedule(service.id, update),
      `${service.name} schedule saved.`,
    )
  },
}))
