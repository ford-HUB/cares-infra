import { Button } from '@/components/ui/button'
import { ContentShell } from '../../components/portal/ui/content-shell'
import { DepartmentStatistics } from '../../components/statistics/department-statistics'
import { DepartmentStatisticsSkeleton } from '../../components/statistics/department-statistics-skeleton'
import { useSystemStatistics } from '../../hooks/use-system-statistics'
import { DEPARTMENT_STATISTICS_DEPARTMENTS } from '../../services/department-statistics-service'

/**
 * The admin and director Statistics screen — the whole system by default, with a
 * department filter to read one college the way its coordinator does.
 */
export function SystemStatisticsPage() {
  const {
    pending,
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
  } = useSystemStatistics()

  if (pending) {
    return (
      <ContentShell>
        <DepartmentStatisticsSkeleton />
      </ContentShell>
    )
  }

  if (error && !statistics) {
    return (
      <ContentShell>
        <div className="flex h-64 flex-col items-center justify-center gap-4 text-center">
          <p className="text-gray-600">{error}</p>
          <Button type="button" onClick={refresh} disabled={refreshing}>
            Try again
          </Button>
        </div>
      </ContentShell>
    )
  }

  if (!statistics) return null

  return (
    <ContentShell>
      <DepartmentStatistics
        data={statistics}
        title="System Statistics"
        range={range}
        category={category}
        departmentFilter={{
          value: departmentFilter,
          options: DEPARTMENT_STATISTICS_DEPARTMENTS,
          onChange: changeDepartment,
        }}
        refreshing={refreshing || loading}
        onRangeChange={changeRange}
        onCategoryChange={changeCategory}
        onRefresh={refresh}
        onExportCsv={exportCsv}
        onExportPdf={exportPdf}
      />
    </ContentShell>
  )
}
