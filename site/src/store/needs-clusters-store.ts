import { create } from 'zustand'
import { CLUSTER_DEFAULT_SEED, CLUSTER_K_DEFAULT } from '../constants/residential-needs'
import { clusterHouseholds } from '../services/residential-needs-service'
import type { NeedsClusteringResult } from '../types/residential-needs'

interface NeedsClustersState {
  result: NeedsClusteringResult | null
  k: number
  seed: number
  loading: boolean
  error: string | null
  /** Drops replies that arrive after a newer request. */
  requestId: number
  fetchClusters: () => Promise<void>
  setK: (k: number) => Promise<void>
  reseed: () => Promise<void>
}

/** Previous result stays while the next is in flight so cards don't flash. */
export const useNeedsClustersStore = create<NeedsClustersState>((set, get) => ({
  result: null,
  k: CLUSTER_K_DEFAULT,
  seed: CLUSTER_DEFAULT_SEED,
  loading: false,
  error: null,
  requestId: 0,

  fetchClusters: async () => {
    const { k, seed } = get()
    const requestId = get().requestId + 1
    set({ loading: true, error: null, requestId })
    const res = await clusterHouseholds(k, seed)
    if (get().requestId !== requestId) return
    if (res.success && res.data) {
      set({ result: res.data, loading: false })
    } else {
      set({ error: res.message ?? 'Unable to cluster households', loading: false })
    }
  },

  setK: async (k) => {
    set({ k })
    await get().fetchClusters()
  },

  reseed: async () => {
    set({ seed: get().seed + 1 })
    await get().fetchClusters()
  },
}))
