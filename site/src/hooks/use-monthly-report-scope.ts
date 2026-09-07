import { useEffect, useMemo, useState } from 'react'
import {
  PERIOD_FILTER_ALL,
  type PeriodFilter,
} from '../constants/monthly-report'
import { useMonthlyReportStore } from '../store/monthly-report-store'

/**
 * The period and search box scope both report screens the same way, and both read
 * from the same store, so the queue and the library stay in step: approving a report
 * on one shows it filed on the other without a refetch.
 */
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
