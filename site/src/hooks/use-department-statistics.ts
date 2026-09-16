import { useCallback, useEffect, useState } from 'react'
import { STATISTICS_EXPORT_FILENAME } from '../constants/department-statistics'
import { useDepartmentStatisticsStore } from '../store/department-statistics-store'
import { useProfileStore } from '../store/profile-store'
import type { StatisticsRange } from '../types/department-statistics'
import { exportDepartmentStatisticsCsv } from '../utils/export-department-statistics-csv'

/**
 * Wires the coordinator's department (from their profile) to the statistics store,
 * and owns the toolbar's operations. The department is the scope of every request —
 * a coordinator never picks it, their profile does.
 */
export function useDepartmentStatistics() {
  const profile = useProfileStore((s) => s.profile)
  const profileInitialized = useProfileStore((s) => s.initialized)
  const ensureProfile = useProfileStore((s) => s.ensureProfile)
  const department = profile?.department?.trim() || null

  const statistics = useDepartmentStatisticsStore((s) => s.statistics)
  const range = useDepartmentStatisticsStore((s) => s.range)
  const category = useDepartmentStatisticsStore((s) => s.category)
  const loading = useDepartmentStatisticsStore((s) => s.loading)
  const initialized = useDepartmentStatisticsStore((s) => s.initialized)
  const error = useDepartmentStatisticsStore((s) => s.error)
  const fetchStatistics = useDepartmentStatisticsStore((s) => s.fetchStatistics)
  const setRange = useDepartmentStatisticsStore((s) => s.setRange)
  const setCategory = useDepartmentStatisticsStore((s) => s.setCategory)

  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    void ensureProfile()
  }, [ensureProfile])

  useEffect(() => {
    if (department) void fetchStatistics(department)
  }, [department, fetchStatistics])

  const refresh = useCallback(async () => {
    if (!department) return
    setRefreshing(true)
    await fetchStatistics(department)
    setRefreshing(false)
  }, [department, fetchStatistics])

  const changeRange = useCallback(
    (next: StatisticsRange) => {
      if (department) void setRange(department, next)
    },
    [department, setRange],
  )

  const changeCategory = useCallback(
    (next: string) => {
      if (department) void setCategory(department, next)
    },
    [department, setCategory],
  )

  const exportCsv = useCallback(() => {
    if (!statistics) return
    exportDepartmentStatisticsCsv(
      statistics,
      `${STATISTICS_EXPORT_FILENAME}-${statistics.range}.csv`,
    )
  }, [statistics])

  return {
    department,
    /** True until both the profile and the first statistics request have settled. */
    pending: !profileInitialized || (department !== null && !initialized),
    statistics,
    range,
    category,
    loading,
    error,
    refreshing,
    refresh,
    changeRange,
    changeCategory,
    exportCsv,
  }
}
