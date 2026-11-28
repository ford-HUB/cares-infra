import { useCallback, useEffect, useState } from 'react'
import { useDepartmentStatisticsStore } from '../store/department-statistics-store'
import { useProfileStore } from '../store/profile-store'
import type { StatisticsRange } from '../types/department-statistics'

/** Department comes from the coordinator's profile, never picked. */
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



  return {
    department,
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
  }
}
