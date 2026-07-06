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
import { ContentShell } from '../../components/portal/ui/content-shell'
import {
  GradientMetricTile,
  InlinePageHeader,
  LoadingState,
  MetricTile,
  SectionCard,
  StatCard,
} from '../../components/portal/ui/page-chrome'
import { formatNumber } from '../../constants/formatting'
import { isCoordinatorRole, useAuthStore } from '../../store/auth-store'
import { useOverviewStore } from '../../store/overview-store'
import { isDepartmentOverview, isStaffOverview } from '../../types/overview'

export function StaffDashboard() {
  const role = useAuthStore((s) => s.user?.role ?? null)
  const isCoordinator = isCoordinatorRole(role)
  const { overview, loading, error, fetchStaffOverview, fetchDepartmentOverview } =
    useOverviewStore()
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (isCoordinator) {
      void fetchDepartmentOverview()
    } else {
      void fetchStaffOverview()
    }
  }, [fetchDepartmentOverview, fetchStaffOverview, isCoordinator])

  const handleRefresh = async () => {
    setRefreshing(true)
    if (isCoordinator) {
      await fetchDepartmentOverview()
    } else {
      await fetchStaffOverview()
    }
    setRefreshing(false)
  }

  if (loading && !overview) {
    return (
      <ContentShell>
        <LoadingState message="Loading overview..." />
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
    return (
      <ContentShell>
        <InlinePageHeader
          title="Department Overview"
          description={`${overview.departmentName} — activity and metrics at a glance`}
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
            value={formatNumber(overview.upcomingEvents)}
            icon={Calendar}
            color="bg-blue-500"
            subtitle="Events in your department"
          />
          <StatCard
            title="Pending Approvals"
            value={formatNumber(overview.pendingApprovals)}
            icon={ClipboardCheck}
            color="bg-orange-500"
            subtitle="Requires your attention"
          />
          <StatCard
            title="Active Volunteers"
            value={formatNumber(overview.activeVolunteers)}
            icon={UserCheck}
            color="bg-green-500"
            subtitle={`${formatNumber(overview.recentRegistrations)} in last 7 days`}
          />
          <StatCard
            title="Monthly Completion"
            value={`${overview.monthlyCompletion}%`}
            icon={Activity}
            color="bg-purple-500"
            subtitle="Department reporting progress"
          />
        </div>

        <SectionCard title="Department Metrics" icon={TrendingUp}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <MetricTile
              label="Upcoming Events"
              value={formatNumber(overview.upcomingEvents)}
              hint="Events in your department"
              icon={Calendar}
            />
            <MetricTile
              label="Pending Tasks"
              value={formatNumber(overview.pendingDocuments)}
              hint="Awaiting approval"
              icon={ClipboardCheck}
              iconClassName="text-orange-600"
              valueClassName="text-orange-600"
            />
            <MetricTile
              label="Recent Registrations"
              value={formatNumber(overview.recentRegistrations)}
              hint="Last 7 days"
              icon={UserCheck}
              iconClassName="text-green-600"
            />
            <MetricTile
              label="Recent Attendance"
              value={formatNumber(overview.recentAttendance)}
              hint="Last 7 days"
              icon={Activity}
              iconClassName="text-purple-600"
            />
            <MetricTile
              label="Recent Submissions"
              value={formatNumber(overview.recentSubmissions)}
              hint="Documents submitted"
              icon={FileText}
              iconClassName="text-teal-600"
            />
          </div>
        </SectionCard>
      </ContentShell>
    )
  }

  if (!isStaffOverview(overview)) return null

  const { stats } = overview
  const activationRate =
    stats.totalVolunteers + stats.totalStudents > 0
      ? (stats.totalVolunteers / (stats.totalVolunteers + stats.totalStudents)) * 100
      : 0
  const completionRate =
    stats.totalEvents > 0 ? (stats.completedEvents / stats.totalEvents) * 100 : 0

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
          value={formatNumber(stats.totalVolunteers + stats.totalStudents)}
          icon={Users}
          color="bg-blue-500"
          subtitle={`${formatNumber(stats.totalVolunteers)} active (${activationRate.toFixed(1)}%)`}
        />
        <StatCard
          title="Total Events"
          value={formatNumber(stats.totalEvents)}
          icon={Calendar}
          color="bg-purple-500"
          subtitle={`${formatNumber(stats.upcomingEvents)} upcoming, ${formatNumber(stats.ongoingEvents)} ongoing`}
        />
        <StatCard
          title="Total Volunteers"
          value={formatNumber(stats.totalVolunteers)}
          icon={UserCheck}
          color="bg-green-500"
          subtitle={`${formatNumber(stats.totalParticipants)} registrations`}
        />
        <StatCard
          title="Total Beneficiaries"
          value={formatNumber(stats.totalBeneficiaries)}
          icon={Heart}
          color="bg-red-500"
          subtitle="Beneficiaries served"
        />
      </div>

      <div className="mb-8">
        <SectionCard title="System Metrics" icon={TrendingUp}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <MetricTile
              label="Total Attendance"
              value={formatNumber(stats.totalAttendance)}
              hint={`${formatNumber(stats.recentAttendance)} recent (7d)`}
              icon={Activity}
            />
            <MetricTile
              label="Event Completion"
              value={`${completionRate.toFixed(1)}%`}
              hint={`${formatNumber(stats.completedEvents)} completed events`}
              icon={Award}
              iconClassName="text-purple-600"
              valueClassName="text-green-600"
            />
            <MetricTile
              label="Total Students"
              value={formatNumber(stats.totalStudents)}
              hint="Registered students"
              icon={FileText}
              iconClassName="text-orange-600"
            />
            <MetricTile
              label="Total Participants"
              value={formatNumber(stats.totalParticipants)}
              hint="Event registrations"
              icon={FileCheck}
              iconClassName="text-teal-600"
            />
            <MetricTile
              label="Recent Registrations"
              value={formatNumber(stats.recentRegistrations)}
              hint="Last 7 days"
              icon={BadgeCheck}
              iconClassName="text-indigo-600"
            />
          </div>
        </SectionCard>
      </div>

      <div className="mb-6">
        <SectionCard title="Recent Activity (Last 7 Days)" icon={BarChart3}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <GradientMetricTile
              label="Recent Events"
              value={formatNumber(stats.upcomingEvents)}
              gradientClass="bg-gradient-to-br from-blue-50 to-blue-100"
              borderClass="border-blue-200"
              valueClass="text-blue-900"
            />
            <GradientMetricTile
              label="Recent Registrations"
              value={formatNumber(stats.recentRegistrations)}
              gradientClass="bg-gradient-to-br from-green-50 to-green-100"
              borderClass="border-green-200"
              valueClass="text-green-900"
            />
            <GradientMetricTile
              label="Recent Attendance"
              value={formatNumber(stats.recentAttendance)}
              gradientClass="bg-gradient-to-br from-purple-50 to-purple-100"
              borderClass="border-purple-200"
              valueClass="text-purple-900"
            />
            <GradientMetricTile
              label="Completed Events"
              value={formatNumber(stats.completedEvents)}
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
