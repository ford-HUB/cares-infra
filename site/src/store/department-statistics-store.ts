import { create } from 'zustand'
import {
  STATISTICS_CATEGORY_ALL,
  STATISTICS_DEFAULT_RANGE,
  STATISTICS_DEPARTMENT_ALL,
} from '../constants/department-statistics'
import { getDepartmentStatistics } from '../services/department-statistics-service'
import type {
  DepartmentStatistics,
  StatisticsRange,
} from '../types/department-statistics'

export type StatisticsScope = string | null

interface DepartmentStatisticsState {
  statistics: DepartmentStatistics | null
  range: StatisticsRange
  category: string
  /** Admin/director only; a coordinator's scope comes from their profile. */
  departmentFilter: string
  loading: boolean
  initialized: boolean
  error: string | null
  fetchStatistics: (scope: StatisticsScope) => Promise<void>
  setRange: (scope: StatisticsScope, range: StatisticsRange) => Promise<void>
  setCategory: (scope: StatisticsScope, category: string) => Promise<void>
  setDepartmentFilter: (department: string) => void
}

export const useDepartmentStatisticsStore = create<DepartmentStatisticsState>(
  (set, get) => ({
    statistics: null,
    range: STATISTICS_DEFAULT_RANGE,
    category: STATISTICS_CATEGORY_ALL,
    departmentFilter: STATISTICS_DEPARTMENT_ALL,
    loading: false,
    initialized: false,
    error: null,

    fetchStatistics: async (scope) => {
      const { range, category } = get()
      set({ loading: true, error: null })
      const res = await getDepartmentStatistics(scope, { range, category })
      if (res.success && res.data) {
        set({ statistics: res.data, loading: false, initialized: true })
      } else {
        set({
          error: res.message ?? 'Failed to load statistics',
          loading: false,
          initialized: true,
        })
      }
    },

    setRange: async (scope, range) => {
      set({ range })
      await get().fetchStatistics(scope)
    },

    setCategory: async (scope, category) => {
      set({ category })
      await get().fetchStatistics(scope)
    },

    setDepartmentFilter: (department) => set({ departmentFilter: department }),
  }),
)
