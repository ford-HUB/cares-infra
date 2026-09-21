import { useCallback, useEffect, useState } from 'react'
import {
  STATISTICS_DEPARTMENT_ALL,
  STATISTICS_EXPORT_FILENAME,
} from '../constants/department-statistics'
import { useDepartmentStatisticsStore } from '../store/department-statistics-store'
import type { StatisticsRange } from '../types/department-statistics'
import { exportDepartmentStatisticsCsv } from '../utils/export-department-statistics-csv'
import { exportDepartmentStatisticsPdf } from '../utils/export-department-statistics-pdf'

/**
 * The admin and director view of the same statistics: every department by default,
 * narrowed to one college through the toolbar's department filter rather than the
 * caller's profile.
 */
export function useSystemStatistics() {
  const statistics = useDepartmentStatisticsStore((s) => s.statistics)
  const range = useDepartmentStatisticsStore((s) => s.range)
  const category = useDepartmentStatisticsStore((s) => s.category)
  const departmentFilter = useDepartmentStatisticsStore((s) => s.departmentFilter)
  const loading = useDepartmentStatisticsStore((s) => s.loading)
  const initialized = useDepartmentStatisticsStore((s) => s.initialized)
  const error = useDepartmentStatisticsStore((s) => s.error)
  const fetchStatistics = useDepartmentStatisticsStore((s) => s.fetchStatistics)
  const setRange = useDepartmentStatisticsStore((s) => s.setRange)
  const setCategory = useDepartmentStatisticsStore((s) => s.setCategory)
  const setDepartmentFilter = useDepartmentStatisticsStore((s) => s.setDepartmentFilter)

  const [refreshing, setRefreshing] = useState(false)

  const scope = departmentFilter === STATISTICS_DEPARTMENT_ALL ? null : departmentFilter

  // Mount and every department change; range and category refetch through their setters.
  useEffect(() => {
    void fetchStatistics(scope)
  }, [scope, fetchStatistics])

  const refresh = useCallback(async () => {
    setRefreshing(true)
    await fetchStatistics(scope)
    setRefreshing(false)
  }, [scope, fetchStatistics])

  const changeRange = useCallback(
    (next: StatisticsRange) => void setRange(scope, next),
    [scope, setRange],
  )

  const changeCategory = useCallback(
    (next: string) => void setCategory(scope, next),
    [scope, setCategory],
  )

  const changeDepartment = useCallback(
    (next: string) => setDepartmentFilter(next),
    [setDepartmentFilter],
  )

  const exportCsv = useCallback(() => {
    if (!statistics) return
    exportDepartmentStatisticsCsv(
      statistics,
      `${STATISTICS_EXPORT_FILENAME}-${statistics.range}.csv`,
    )
  }, [statistics])

  const exportPdf = useCallback(() => {
    if (!statistics) return
    exportDepartmentStatisticsPdf(statistics, { title: 'System Statistics', category })
  }, [statistics, category])

  return {
    pending: !initialized,
    statistics,
    range,
    category,
    departmentFilter,
    loading,
    error,
    refreshing,
    refresh,
    changeRange,
    changeCategory,
    changeDepartment,
    exportCsv,
    exportPdf,
  }
}
