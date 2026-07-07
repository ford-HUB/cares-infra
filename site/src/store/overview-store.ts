import { create } from 'zustand'
import {
  getDepartmentOverview,
  getStaffOverview,
} from '../services/overview-service'
import type { OverviewData } from '../types/overview'

interface OverviewState {
  overview: OverviewData | null
  loading: boolean
  error: string | null
  fetchStaffOverview: () => Promise<void>
  fetchDepartmentOverview: () => Promise<void>
}

export const useOverviewStore = create<OverviewState>((set) => ({
  overview: null,
  loading: false,
  error: null,

  fetchStaffOverview: async () => {
    set({ loading: true, error: null })
    const res = await getStaffOverview()
    if (res.success && res.data) {
      set({ overview: res.data, loading: false })
    } else {
      set({ error: res.message ?? 'Failed to load overview', loading: false })
    }
  },

  fetchDepartmentOverview: async () => {
    set({ loading: true, error: null })
    const res = await getDepartmentOverview()
    if (res.success && res.data) {
      set({ overview: res.data, loading: false })
    } else {
      set({ error: res.message ?? 'Failed to load overview', loading: false })
    }
  },
}))
