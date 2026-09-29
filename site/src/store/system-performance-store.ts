import { create } from 'zustand'
import {
  fetchPerformanceSnapshot,
  fetchPerformanceTick,
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
    if (!snapshot) return

    let tick
    try {
      tick = await fetchPerformanceTick()
    } catch {
      // A missed tick leaves the last reading in place; the next one catches up.
      return
    }
    const { sample, cores, processes, loadAverage } = tick
    if (!sample) return

    const current = get().snapshot
    if (!current) return

    // The sampler and this timer run on different clocks, so the same reading can
    // come back twice; appending it again would draw a flat step that never happened.
    const last = current.samples[current.samples.length - 1]
    const { points } = findPerformanceRange(range)
    const samples =
      last && last.at === sample.at
        ? current.samples
        : [...current.samples, sample].slice(-points)

    set({
      snapshot: {
        ...current,
        capturedAt: sample.at,
        samples,
        cores,
        processes,
        loadAverage,
      },
    })
  },
}))
