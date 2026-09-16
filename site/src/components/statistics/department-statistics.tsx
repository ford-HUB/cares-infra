import { Calendar, Clock, MapPinCheck, Users } from 'lucide-react'
import { DEPARTMENT_STATISTICS_CATEGORIES } from '../../services/department-statistics-service'
import { STATISTICS_RANGE_MONTHS } from '../../constants/department-statistics'
import { formatNumber } from '../../constants/formatting'
import type { DepartmentStatistics as DepartmentStatisticsData } from '../../types/department-statistics'
import type { StatisticsRange } from '../../types/department-statistics'
import { AttendanceOutcomesChart } from './ui/attendance-outcomes-chart'
import { DepartmentActivityChart } from './ui/department-activity-chart'
import { EventsByCategoryChart } from './ui/events-by-category-chart'
import { EventsPerMonthChart } from './ui/events-per-month-chart'
import { ParticipationTrendChart } from './ui/participation-trend-chart'
import { ReportStatusChart } from './ui/report-status-chart'
import { ServiceHoursChart } from './ui/service-hours-chart'
import { StatisticTile } from './ui/statistic-tile'
import { StatisticsToolbar } from './ui/statistics-toolbar'
import { TopEventsTable } from './ui/top-events-table'
import { YearLevelParticipationList } from './ui/year-level-participation'

interface DepartmentStatisticsProps {
  data: DepartmentStatisticsData
  title: string
  range: StatisticsRange
  category: string
  /** Director-level only: lets the reader narrow the whole system to one college. */
  departmentFilter?: {
    value: string
    options: readonly string[]
    onChange: (department: string) => void
  }
  refreshing: boolean
  onRangeChange: (range: StatisticsRange) => void
  onCategoryChange: (category: string) => void
  onRefresh: () => void
  onExport: () => void
}

/**
 * The coordinator's department in numbers. Four headline figures with their movement,
 * then the two trends that explain them (participation, events held), then the
 * breakdowns — outcomes, categories, hours, reports, year levels — and the table.
 * Every block obeys the period and category filters in the toolbar.
 */
export function DepartmentStatistics({
  data,
  title,
  range,
  category,
  departmentFilter,
  refreshing,
  onRangeChange,
  onCategoryChange,
  onRefresh,
  onExport,
}: DepartmentStatisticsProps) {
  const comparison = `vs prior ${STATISTICS_RANGE_MONTHS[range]} mo`
  const percent = (value: number) => `${value.toFixed(1)}%`

  return (
    <>
      <StatisticsToolbar
        title={title}
        scopeLabel={data.department ?? 'All departments'}
        generatedAt={data.generatedAt}
        range={range}
        category={category}
        categories={DEPARTMENT_STATISTICS_CATEGORIES}
        departmentFilter={departmentFilter}
        refreshing={refreshing}
        onRangeChange={onRangeChange}
        onCategoryChange={onCategoryChange}
        onRefresh={onRefresh}
        onExport={onExport}
      />

      <div className="mb-4 grid grid-cols-1 gap-4 *:min-w-0 md:grid-cols-2 xl:grid-cols-4">
        <StatisticTile
          icon={Calendar}
          chipClass="bg-emerald-50 text-emerald-600"
          label="Events held"
          summary={data.summary.eventsHeld}
          format={formatNumber}
          comparison={comparison}
        />
        <StatisticTile
          icon={Users}
          chipClass="bg-[var(--cares-tag-volunteer-bg)] text-[var(--cares-tag-volunteer-text)]"
          label="Active volunteers"
          summary={data.summary.activeVolunteers}
          format={formatNumber}
          comparison={comparison}
        />
        <StatisticTile
          icon={MapPinCheck}
          chipClass="bg-emerald-50 text-emerald-600"
          label="Attendance rate"
          summary={data.summary.attendanceRate}
          format={percent}
          comparison={comparison}
        />
        <StatisticTile
          icon={Clock}
          chipClass="bg-gray-100 text-gray-600"
          label="Service hours"
          summary={data.summary.serviceHours}
          format={formatNumber}
          comparison={comparison}
        />
      </div>

      {data.departments.length > 0 && (
        <div className="mb-4">
          <DepartmentActivityChart departments={data.departments} />
        </div>
      )}

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="min-w-0 lg:col-span-3">
          <ParticipationTrendChart monthly={data.monthly} />
        </div>
        <div className="min-w-0 lg:col-span-2">
          <EventsPerMonthChart monthly={data.monthly} />
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 *:min-w-0 lg:grid-cols-3">
        <AttendanceOutcomesChart categories={data.categories} />
        <EventsByCategoryChart categories={data.categories} />
        <ServiceHoursChart monthly={data.monthly} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="min-w-0 lg:col-span-3">
          <TopEventsTable events={data.topEvents} />
        </div>
        <div className="flex min-w-0 flex-col gap-4 lg:col-span-2">
          <ReportStatusChart reports={data.reports} />
          <YearLevelParticipationList yearLevels={data.yearLevels} />
        </div>
      </div>
    </>
  )
}
