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

/** The college the numbers are scoped to; null reads every department. */
export type StatisticsScope = string | null

interface DepartmentStatisticsState {
  statistics: DepartmentStatistics | null
  range: StatisticsRange
  category: string
  /**
   * The director-level department filter. A coordinator never sets it — their
   * profile fixes the scope — so it only drives the admin and director view.
   */
  departmentFilter: string
  loading: boolean
  /** False until the first fetch settles, so the mount render shows the skeleton. */
  initialized: boolean
  error: string | null
  fetchStatistics: (scope: StatisticsScope) => Promise<void>
  setRange: (scope: StatisticsScope, range: StatisticsRange) => Promise<void>
  setCategory: (scope: StatisticsScope, category: string) => Promise<void>
  /** Only records the choice — the system hook refetches when the scope changes. */
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
