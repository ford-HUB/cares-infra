import { useEffect, useMemo, useState } from 'react'
import {
  PERIOD_FILTER_ALL,
  type PeriodFilter,
} from '../constants/monthly-report'
import { useMonthlyReportStore } from '../store/monthly-report-store'

/** Shared store keeps queue and library in step without refetching. */
export function useMonthlyReportScope() {
  const reports = useMonthlyReportStore((s) => s.reports)
  const loading = useMonthlyReportStore((s) => s.loading)
  const initialized = useMonthlyReportStore((s) => s.initialized)
  const error = useMonthlyReportStore((s) => s.error)
  const fetchReports = useMonthlyReportStore((s) => s.fetchReports)

  const [search, setSearch] = useState('')
  const [period, setPeriod] = useState<PeriodFilter>(PERIOD_FILTER_ALL)

  useEffect(() => {
    void fetchReports()
  }, [fetchReports])

  const periods = useMemo(
    () => [...new Set(reports.map((report) => report.period))].sort().reverse(),
    [reports],
  )

  const scoped = useMemo(() => {
    const term = search.trim().toLowerCase()

    return reports.filter((report) => {
      const matchesPeriod = period === PERIOD_FILTER_ALL || report.period === period
      const matchesSearch =
        !term ||
        report.reference.toLowerCase().includes(term) ||
        report.title.toLowerCase().includes(term) ||
        report.department.toLowerCase().includes(term) ||
        report.submittedBy.name.toLowerCase().includes(term)
      return matchesPeriod && matchesSearch
    })
  }, [reports, period, search])

  return {
    reports,
    scoped,
    periods,
    period,
    setPeriod,
    search,
    setSearch,
    loading,
    initialized,
    error,
    fetchReports,
  }
}
