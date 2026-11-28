import { create } from 'zustand'
import { DEFAULT_SYSTEM_USAGE_RANGE } from '../constants/system-usage'
import { cpuBusy } from '../constants/system-performance'
import { fetchSystemDiagnostics } from '../services/system-diagnostics-service'
import {
  fetchPerformanceSnapshot,
  fetchPerformanceTick,
} from '../services/system-performance-service'
import { fetchSystemServices } from '../services/system-service-service'
import { getCpuHistory } from '../services/system-usage-service'
import type { SystemDiagnostics } from '../types/system-diagnostics'
import type { PerformanceSample, PerformanceSnapshot } from '../types/system-performance'
import type { SystemService } from '../types/system-service'
import type { DailyUsage, SystemUsageRangeDays } from '../types/system-usage'

interface SourceStatus {
  initialized: boolean
  error: string | null
}

const PENDING: SourceStatus = { initialized: false, error: null }
const OK: SourceStatus = { initialized: true, error: null }
const failed = (error: unknown): SourceStatus => ({
  initialized: true,
  error: error instanceof Error ? error.message : 'Could not be loaded',
})

interface SystemUsageState {
  range: SystemUsageRangeDays
  /** Sample data until the server keeps a daily history. */
  history: DailyUsage[]
  historyInitialized: boolean

  snapshot: PerformanceSnapshot | null
  snapshotStatus: SourceStatus
  liveSample: PerformanceSample | null
  /** Catches 3 s spikes the 20 min buckets smooth over. */
  livePeak: { value: number; at: string } | null

  services: SystemService[]
  servicesStatus: SourceStatus
  diagnostics: SystemDiagnostics | null
  diagnosticsStatus: SourceStatus

  fetchHistory: (range?: SystemUsageRangeDays) => Promise<void>
  fetchSnapshot: () => Promise<void>
  tick: () => Promise<void>
  fetchServices: () => Promise<void>
  fetchDiagnostics: () => Promise<void>
}

/** Each source loads and fails independently; refreshes keep the last good reading. */
export const useSystemUsageStore = create<SystemUsageState>((set, get) => ({
  range: DEFAULT_SYSTEM_USAGE_RANGE,
  history: [],
  historyInitialized: false,
  snapshot: null,
  snapshotStatus: PENDING,
  liveSample: null,
  livePeak: null,
  services: [],
  servicesStatus: PENDING,
  diagnostics: null,
  diagnosticsStatus: PENDING,

  fetchHistory: async (range = get().range) => {
    set({ range })
    const res = await getCpuHistory(range)
    set({ history: res.data ?? [], historyInitialized: true })
  },

  fetchSnapshot: async () => {
    try {
      set({ snapshot: await fetchPerformanceSnapshot('day'), snapshotStatus: OK })
    } catch (error) {
      set({ snapshotStatus: failed(error) })
    }
  },

  tick: async () => {
    try {
      const { sample } = await fetchPerformanceTick()
      if (!sample) return
      const busy = cpuBusy(sample)
      const peak = get().livePeak
      set({
        liveSample: sample,
        livePeak: !peak || busy > peak.value ? { value: busy, at: sample.at } : peak,
      })
    } catch {
      // Missed tick: keep the last reading.
    }
  },

  fetchServices: async () => {
    try {
      set({ services: await fetchSystemServices(), servicesStatus: OK })
    } catch (error) {
      set({ servicesStatus: failed(error) })
    }
  },

  fetchDiagnostics: async () => {
    try {
      set({ diagnostics: await fetchSystemDiagnostics(), diagnosticsStatus: OK })
    } catch (error) {
      set({ diagnosticsStatus: failed(error) })
    }
  },
}))
