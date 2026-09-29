import { RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { AdminOverview } from '../../components/overview/admin-overview'
import { DepartmentOverview } from '../../components/overview/department-overview'
import { OverviewSkeleton } from '../../components/overview/ui/overview-skeleton'
import { ContentShell } from '../../components/portal/ui/content-shell'
import { InlinePageHeader } from '../../components/portal/ui/page-chrome'
import { isCoordinatorRole, useAuthStore } from '../../store/auth-store'
import { useOverviewStore } from '../../store/overview-store'
import { isAdminOverview, isDepartmentOverview } from '../../types/overview'

export function AdminDashboard() {
  const role = useAuthStore((s) => s.user?.role ?? null)
  const isCoordinator = isCoordinatorRole(role)
  const isDirector = role === 'director'
  const {
    overview,
    loading,
    initialized,
    error,
    fetchAdminOverview,
    fetchDepartmentOverview,
  } = useOverviewStore()
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (isCoordinator) {
      void fetchDepartmentOverview()
    } else {
      void fetchAdminOverview()
    }
  }, [fetchDepartmentOverview, fetchAdminOverview, isCoordinator])

  const handleRefresh = async () => {
    setRefreshing(true)
    if (isCoordinator) {
      await fetchDepartmentOverview()
    } else {
      await fetchAdminOverview()
    }
    setRefreshing(false)
  }

  // `!initialized` covers the mount render, before the effect has flipped `loading`.
  if (!initialized || (loading && !overview)) {
    return (
      <ContentShell>
        <OverviewSkeleton isCoordinator={isCoordinator} />
      </ContentShell>
    )
  }

  if (error && !overview) {
    return (
      <ContentShell>
        <div className="flex h-64 flex-col items-center justify-center text-center">
          <p className="mb-4 text-gray-600">{error}</p>
          <button
            type="button"
            onClick={handleRefresh}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </ContentShell>
    )
  }

  if (!overview) return null

  const refreshButton = (
    <button
      type="button"
      onClick={handleRefresh}
      disabled={refreshing || loading}
      className="flex items-center space-x-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-gray-700 shadow-sm transition-colors hover:bg-gray-100 disabled:opacity-50"
    >
      <RefreshCw className={`h-4 w-4 ${refreshing || loading ? 'animate-spin' : ''}`} />
      <span>Refresh</span>
    </button>
  )

  if (isCoordinator && isDepartmentOverview(overview)) {
    return (
      <ContentShell>
        <InlinePageHeader
          title="Department Overview"
          description={`${overview.department ?? 'No department assigned'} — activity and metrics at a glance`}
          action={refreshButton}
        />
        <DepartmentOverview overview={overview} />
      </ContentShell>
    )
  }

  if (!isAdminOverview(overview)) return null

  return (
    <ContentShell>
      <InlinePageHeader
        title="System Overview"
        description="Comprehensive view of UCLM CARES System statistics and activities"
        action={refreshButton}
      />
      <AdminOverview overview={overview} isDirector={isDirector} />
    </ContentShell>
  )
}
