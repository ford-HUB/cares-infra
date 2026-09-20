import {
  Activity,
  Award,
  BadgeCheck,
  BarChart3,
  Calendar,
  ClipboardCheck,
  FileCheck,
  FileText,
  Heart,
  RefreshCw,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { AdminDashboardSkeleton } from '../../components/portal/ui/admin-dashboard-skeleton'
import { ContentShell } from '../../components/portal/ui/content-shell'
import { ResidentialNeedsModuleCard } from '../../components/residential-needs/residential-needs-module-card'
import {
  GradientMetricTile,
  InlinePageHeader,
  MetricTile,
  SectionCard,
  StatCard,
} from '../../components/portal/ui/page-chrome'
import { formatNumber } from '../../constants/formatting'
import { isCoordinatorRole, useAuthStore } from '../../store/auth-store'
import { useOverviewStore } from '../../store/overview-store'
import { isDepartmentOverview, isAdminOverview } from '../../types/overview'

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
        <AdminDashboardSkeleton isCoordinator={isCoordinator} />
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

  if (isCoordinator && isDepartmentOverview(overview)) {
    const reportsSubmitted =
      overview.reports.underReview + overview.reports.approved + overview.reports.returned
    const reportApprovalRate =
      reportsSubmitted > 0 ? (overview.reports.approved / reportsSubmitted) * 100 : 0

    return (
      <ContentShell>
        <InlinePageHeader
          title="Department Overview"
          description={`${overview.department ?? 'No department assigned'} — activity and metrics at a glance`}
          action={
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="flex items-center space-x-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-gray-700 shadow-sm transition-colors hover:bg-gray-100 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing || loading ? 'animate-spin' : ''}`}
              />
              <span>Refresh</span>
            </button>
          }
        />

        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Upcoming Events"
            value={formatNumber(overview.events.upcoming)}
            icon={Calendar}
            color="bg-blue-500"
            subtitle={`${formatNumber(overview.events.ongoing)} ongoing in your department`}
          />
          <StatCard
            title="Pending Approvals"
            value={formatNumber(overview.reports.underReview)}
            icon={ClipboardCheck}
            color="bg-orange-500"
            subtitle="Department reports awaiting director review"
          />
          <StatCard
            title="Active Volunteers"
            value={formatNumber(overview.volunteers)}
            icon={UserCheck}
            color="bg-green-500"
            subtitle={`${formatNumber(overview.newVolunteers)} in last ${overview.recentDays} days`}
          />
          <StatCard
            title="Monthly Completion"
            value={`${reportApprovalRate.toFixed(1)}%`}
            icon={Activity}
            color="bg-purple-500"
            subtitle={`${formatNumber(overview.reports.approved)} of ${formatNumber(reportsSubmitted)} department reports approved`}
          />
        </div>

        <SectionCard title="Department Metrics" icon={TrendingUp}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <MetricTile
              label="Upcoming Events"
              value={formatNumber(overview.events.upcoming)}
              hint={`${formatNumber(overview.events.startingSoon)} start in ${overview.recentDays} days`}
              icon={Calendar}
            />
            <MetricTile
              label="Ongoing Events"
              value={formatNumber(overview.events.ongoing)}
              hint="Running in your department now"
              icon={Activity}
              iconClassName="text-emerald-600"
              valueClassName="text-emerald-600"
            />
            <MetricTile
              label="Completed Events"
              value={formatNumber(overview.events.completed)}
              hint={`${formatNumber(overview.events.total)} department events in total`}
              icon={Award}
              iconClassName="text-indigo-600"
            />
            <MetricTile
              label="Pending Tasks"
              value={formatNumber(overview.reports.returned)}
              hint="Department reports returned for revision"
              icon={ClipboardCheck}
              iconClassName="text-orange-600"
              valueClassName="text-orange-600"
            />
            <MetricTile
              label="Recent Registrations"
              value={formatNumber(overview.newVolunteers)}
              hint={`Last ${overview.recentDays} days`}
              icon={UserCheck}
              iconClassName="text-green-600"
            />
            <MetricTile
              label="Recent Attendance"
              value={formatNumber(overview.attendance.recentCompleted)}
              hint={`Last ${overview.recentDays} days`}
              icon={Activity}
              iconClassName="text-purple-600"
            />
            <MetricTile
              label="Recent Submissions"
              value={formatNumber(reportsSubmitted)}
              hint="Department monthly reports"
              icon={FileText}
              iconClassName="text-teal-600"
            />
          </div>
        </SectionCard>
      </ContentShell>
    )
  }

  if (!isAdminOverview(overview)) return null

  const { community, events, attendance, recentDays } = overview
  const totalUsers =
    community.volunteers + community.beneficiaries + community.donors + community.staff
  const verificationRate =
    community.volunteers > 0
      ? (community.verifiedVolunteers / community.volunteers) * 100
      : 0
  const completionRate = events.total > 0 ? (events.completed / events.total) * 100 : 0

  return (
    <ContentShell>
      <InlinePageHeader
        title="System Overview"
        description="Comprehensive view of UCLM CARES System statistics and activities"
        action={
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="flex items-center space-x-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-gray-700 shadow-sm transition-colors hover:bg-gray-100 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing || loading ? 'animate-spin' : ''}`}
            />
            <span>Refresh</span>
          </button>
        }
      />

      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Users"
          value={formatNumber(totalUsers)}
          icon={Users}
          color="bg-blue-500"
          subtitle={`${formatNumber(community.donors)} donors, ${formatNumber(community.staff)} staff`}
        />
        <StatCard
          title="Total Events"
          value={formatNumber(events.total)}
          icon={Calendar}
          color="bg-purple-500"
          subtitle={`${formatNumber(events.upcoming)} upcoming, ${formatNumber(events.ongoing)} ongoing`}
        />
        <StatCard
          title="Total Volunteers"
          value={formatNumber(community.volunteers)}
          icon={UserCheck}
          color="bg-green-500"
          subtitle={`${formatNumber(community.verifiedVolunteers)} verified (${verificationRate.toFixed(1)}%)`}
        />
        <StatCard
          title="Total Beneficiaries"
          value={formatNumber(community.beneficiaries)}
          icon={Heart}
          color="bg-red-500"
          subtitle="Beneficiaries served"
        />
      </div>

      {isDirector && (
        <div className="mb-8">
          <ResidentialNeedsModuleCard />
        </div>
      )}

      <div className="mb-8">
        <SectionCard title="System Metrics" icon={TrendingUp}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <MetricTile
              label="Total Attendance"
              value={formatNumber(attendance.completed)}
              hint={`${formatNumber(attendance.recentCompleted)} recent (${recentDays}d)`}
              icon={Activity}
            />
            <MetricTile
              label="Event Completion"
              value={`${completionRate.toFixed(1)}%`}
              hint={`${formatNumber(events.completed)} completed events`}
              icon={Award}
              iconClassName="text-purple-600"
              valueClassName="text-green-600"
            />
            <MetricTile
              label="Service Hours"
              value={formatNumber(attendance.serviceHours)}
              hint="Credited to volunteers"
              icon={FileText}
              iconClassName="text-orange-600"
            />
            <MetricTile
              label="Total Participants"
              value={formatNumber(attendance.registrations)}
              hint="Event registrations"
              icon={FileCheck}
              iconClassName="text-teal-600"
            />
            <MetricTile
              label="Recent Registrations"
              value={formatNumber(community.newVolunteers)}
              hint={`Last ${recentDays} days`}
              icon={BadgeCheck}
              iconClassName="text-indigo-600"
            />
          </div>
        </SectionCard>
      </div>

      <div className="mb-6">
        <SectionCard title={`Recent Activity (Last ${recentDays} Days)`} icon={BarChart3}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <GradientMetricTile
              label="Recent Events"
              value={formatNumber(events.startingSoon)}
              gradientClass="bg-gradient-to-br from-blue-50 to-blue-100"
              borderClass="border-blue-200"
              valueClass="text-blue-900"
            />
            <GradientMetricTile
              label="Recent Registrations"
              value={formatNumber(community.newVolunteers)}
              gradientClass="bg-gradient-to-br from-green-50 to-green-100"
              borderClass="border-green-200"
              valueClass="text-green-900"
            />
            <GradientMetricTile
              label="Recent Attendance"
              value={formatNumber(attendance.recentCompleted)}
              gradientClass="bg-gradient-to-br from-purple-50 to-purple-100"
              borderClass="border-purple-200"
              valueClass="text-purple-900"
            />
            <GradientMetricTile
              label="Completed Events"
              value={formatNumber(events.completed)}
              gradientClass="bg-gradient-to-br from-orange-50 to-orange-100"
              borderClass="border-orange-200"
              valueClass="text-orange-900"
            />
          </div>
        </SectionCard>
      </div>
    </ContentShell>
  )
}
