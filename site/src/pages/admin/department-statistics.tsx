import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ContentShell } from '../../components/portal/ui/content-shell'
import { DepartmentStatistics } from '../../components/statistics/department-statistics'
import { DepartmentStatisticsSkeleton } from '../../components/statistics/department-statistics-skeleton'
import { ADMIN_PROFILE_PATH } from '../../constants/routes'
import { useDepartmentStatistics } from '../../hooks/use-department-statistics'

/** The coordinator's Statistics screen — scoped to the department on their profile. */
export function DepartmentStatisticsPage() {
  const {
    department,
    pending,
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
  } = useDepartmentStatistics()

  if (pending) {
    return (
      <ContentShell>
        <DepartmentStatisticsSkeleton />
      </ContentShell>
    )
  }

  if (!department) {
    return (
      <ContentShell>
        <h1 className="text-xl font-bold text-gray-900">Department Statistics</h1>
        <Card size="sm" className="mt-4 border-amber-200 bg-amber-50 shadow-none">
          <CardContent className="text-[13px] text-amber-800">
            No department is set on your profile, so there is nothing to report on. Set
            your college under{' '}
            <Link to={ADMIN_PROFILE_PATH} className="font-medium underline">
              User Profile
            </Link>{' '}
            to see your department&apos;s statistics.
          </CardContent>
        </Card>
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
        title="Department Statistics"
        range={range}
        category={category}
        refreshing={refreshing || loading}
        onRangeChange={changeRange}
        onCategoryChange={changeCategory}
        onRefresh={refresh}
        onExport={exportCsv}
      />
    </ContentShell>
  )
}
