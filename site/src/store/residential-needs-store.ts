import { create } from 'zustand'
import { fetchHouseholds } from '../services/residential-needs-service'
import type { Household } from '../types/residential-needs'

interface ResidentialNeedsState {
  households: Household[]
  /** True once the first fetch came back — until then there is nothing to show. */
  loaded: boolean
  loading: boolean
  error: string | null
  /** Ticks per request so a reply that arrives after a newer request is dropped. */
  requestId: number
  fetchHouseholds: () => Promise<void>
}

/**
 * The submitted Needs Assessment Surveys every Residential Needs screen reads.
 * A refetch keeps the current rows on screen until the new ones arrive.
 */
export const useResidentialNeedsStore = create<ResidentialNeedsState>((set, get) => ({
  households: [],
  loaded: false,
  loading: false,
  error: null,
  requestId: 0,

  fetchHouseholds: async () => {
    const requestId = get().requestId + 1
    set({ loading: true, error: null, requestId })
    const res = await fetchHouseholds()
    if (get().requestId !== requestId) return
    if (res.success && res.data) {
      set({ households: res.data, loaded: true, loading: false })
    } else {
      set({ error: res.message ?? 'Unable to load the survey', loading: false })
    }
  },
}))
