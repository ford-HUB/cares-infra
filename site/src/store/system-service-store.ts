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

interface SystemServiceState {
  services: SystemService[]
  /** False until the first read settles, so the duty banner doesn't flash "0 of 0". */
  initialized: boolean
  error: string | null
  /** Id of the service whose control is in flight — only that row locks. */
  busyId: string | null
  /** Log lines for the service whose viewer is open, newest line last. */
  logs: ServiceLogEntry[]
  /** Which service `logs` belongs to, so a stale read cannot land in another viewer. */
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

/** Shared shape of every control: lock the row, apply, report, unlock. */
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
      // The viewer may have moved on while the read was in flight.
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
