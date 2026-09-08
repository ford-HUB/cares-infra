import { create } from 'zustand'
import {
  derivePerformanceDetail,
  fetchNextPerformanceSample,
  fetchPerformanceSnapshot,
} from '../services/system-performance-service'
import {
  DEFAULT_PERFORMANCE_RANGE,
  findPerformanceRange,
  type PerformanceRangeId,
} from '../constants/system-performance'
import type { PerformanceSnapshot } from '../types/system-performance'

interface SystemPerformanceState {
  snapshot: PerformanceSnapshot | null
  /** False until the first read settles, so the hero never flashes `0%`. */
  initialized: boolean
  error: string | null
  range: PerformanceRangeId
  /** Whether the live window is still appending readings. */
  streaming: boolean
  fetchSnapshot: (options?: { silent?: boolean }) => Promise<void>
  setRange: (range: PerformanceRangeId) => Promise<void>
  setStreaming: (streaming: boolean) => void
  /** Appends one live reading and trims the window to the range's length. */
  tick: () => Promise<void>
}

export const useSystemPerformanceStore = create<SystemPerformanceState>((set, get) => ({
  snapshot: null,
  initialized: false,
  error: null,
  range: DEFAULT_PERFORMANCE_RANGE,
  streaming: true,

  fetchSnapshot: async (options) => {
    if (!options?.silent) set({ error: null })
    try {
      const snapshot = await fetchPerformanceSnapshot(get().range)
      set({ snapshot, error: null, initialized: true })
    } catch {
      set({
        initialized: true,
        error: 'Could not read host metrics. The monitoring agent may be down.',
      })
    }
  },

  setRange: async (range) => {
    // The aggregate windows do not stream; leaving the flag on would show a live chip
    // over a chart that never moves.
    set({ range, streaming: findPerformanceRange(range).streaming, snapshot: null, initialized: false })
    await get().fetchSnapshot()
  },

  setStreaming: (streaming) => set({ streaming }),

  tick: async () => {
    const { snapshot, range } = get()
    if (!snapshot || snapshot.samples.length === 0) return

    const previous = snapshot.samples[snapshot.samples.length - 1]
    const sample = await fetchNextPerformanceSample(previous)
    const { points } = findPerformanceRange(range)
    const samples = [...snapshot.samples, sample].slice(-points)
    const { cores, processes } = derivePerformanceDetail(sample, snapshot.host.vcpu)
    const busy = sample.cpuUser + sample.cpuSystem + sample.cpuIoWait

    set({
      snapshot: {
        ...snapshot,
        capturedAt: sample.at,
        samples,
        cores,
        processes,
        loadAverage: [
          Number(((busy / 100) * snapshot.host.vcpu).toFixed(2)),
          snapshot.loadAverage[1],
          snapshot.loadAverage[2],
        ],
      },
    })
  },
}))
