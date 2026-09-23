import { create } from 'zustand'
import { CLUSTER_DEFAULT_SEED, CLUSTER_K_DEFAULT } from '../constants/residential-needs'
import { clusterHouseholds } from '../services/residential-needs-service'
import type { Household, NeedsClusteringResult } from '../types/residential-needs'

interface NeedsClustersState {
  result: NeedsClusteringResult | null
  /** Groups to find — the toolbar's toggle. */
  k: number
  /** Random start for k-means++; Re-run walks it forward. */
  seed: number
  loading: boolean
  error: string | null
  /** Ticks per request so a reply that arrives after a newer request is dropped. */
  requestId: number
  fetchClusters: (households: Household[]) => Promise<void>
  setK: (households: Household[], k: number) => Promise<void>
  reseed: (households: Household[]) => Promise<void>
}

/**
 * The Clusters screen's grouping, as decision-service returned it. The previous
 * result stays put while the next one is in flight so the cards do not flash.
 */
export const useNeedsClustersStore = create<NeedsClustersState>((set, get) => ({
  result: null,
  k: CLUSTER_K_DEFAULT,
  seed: CLUSTER_DEFAULT_SEED,
  loading: false,
  error: null,
  requestId: 0,

  fetchClusters: async (households) => {
    const { k, seed } = get()
    const requestId = get().requestId + 1
    set({ loading: true, error: null, requestId })
    const res = await clusterHouseholds(households, k, seed)
    if (get().requestId !== requestId) return
    if (res.success && res.data) {
      set({ result: res.data, loading: false })
    } else {
      set({ error: res.message ?? 'Unable to cluster households', loading: false })
    }
  },

  setK: async (households, k) => {
    set({ k })
    await get().fetchClusters(households)
  },

  reseed: async (households) => {
    set({ seed: get().seed + 1 })
    await get().fetchClusters(households)
  },
}))
