import { create } from 'zustand'
import {
  getDepartmentOverview,
  getAdminOverview,
} from '../services/overview-service'
import type { OverviewData } from '../types/overview'

interface OverviewState {
  overview: OverviewData | null
  loading: boolean
  initialized: boolean
  error: string | null
  fetchAdminOverview: () => Promise<void>
  fetchDepartmentOverview: () => Promise<void>
}

export const useOverviewStore = create<OverviewState>((set) => ({
  overview: null,
  loading: false,
  initialized: false,
  error: null,

  fetchAdminOverview: async () => {
    set({ loading: true, error: null })
    const res = await getAdminOverview()
    if (res.success && res.data) {
      set({ overview: res.data, loading: false, initialized: true })
    } else {
      set({
        error: res.message ?? 'Failed to load overview',
        loading: false,
        initialized: true,
      })
    }
  },

  fetchDepartmentOverview: async () => {
    set({ loading: true, error: null })
    const res = await getDepartmentOverview()
    if (res.success && res.data) {
      set({ overview: res.data, loading: false, initialized: true })
    } else {
      set({
        error: res.message ?? 'Failed to load overview',
        loading: false,
        initialized: true,
      })
    }
  },
}))
