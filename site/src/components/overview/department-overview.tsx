import {
  ATTENDANCE_OUTCOME_COLOR,
  ATTENDANCE_OUTCOME_LABELS,
  ATTENDANCE_OUTCOME_ORDER,
  REPORT_OUTCOME_COLOR,
  REPORT_OUTCOME_LABELS,
  REPORT_OUTCOME_ORDER,
} from '../../constants/department-statistics'
import { formatNumber } from '../../constants/formatting'
import {
  EVENT_STATE_COLOR,
  EVENT_STATE_LABELS,
  EVENT_STATE_ORDER,
  OVERVIEW_GAUGE_COLOR,
} from '../../constants/overview'
import type { DepartmentOverviewData } from '../../types/overview'
import { ChartFigure } from '../statistics/ui/chart-card'
import { RateGauge } from './ui/rate-gauge'
import { RecentActivityChart } from './ui/recent-activity-chart'
import { SegmentedTotalChart } from './ui/segmented-total-chart'
import type { OverviewSlice } from './ui/overview-slice'

interface DepartmentOverviewProps {
  overview: DepartmentOverviewData
}

/**
 * The coordinator's own college, charted the same way as the system overview: events,
 * attendance and monthly reports as parts of their totals, then the two rates that say
 * whether the department is keeping up.
 */
export function DepartmentOverview({ overview }: DepartmentOverviewProps) {
  const { events, attendance, reports, recentDays } = overview
  const reportsSubmitted = reports.underReview + reports.approved + reports.returned

  const eventSlices: OverviewSlice[] = EVENT_STATE_ORDER.map((state) => ({
    key: state,
    label: EVENT_STATE_LABELS[state],
    value: events[state],
    color: EVENT_STATE_COLOR[state],
  }))

  const attendanceSlices: OverviewSlice[] = ATTENDANCE_OUTCOME_ORDER.map((outcome) => ({
    key: outcome,
    label: ATTENDANCE_OUTCOME_LABELS[outcome],
    value: attendance[outcome],
    color: ATTENDANCE_OUTCOME_COLOR[outcome],
  }))

  const reportSlices: OverviewSlice[] = REPORT_OUTCOME_ORDER.map((outcome) => ({
    key: outcome,
    label: REPORT_OUTCOME_LABELS[outcome],
    value: reports[outcome],
    color: REPORT_OUTCOME_COLOR[outcome],
  }))

  return (
    <>
      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SegmentedTotalChart
          title="Events"
          description="Where each of your department's events currently stands."
          slices={eventSlices}
          aside={<ChartFigure value={formatNumber(events.total)} label="events" />}
          footer={
            <p className="text-[11px] text-gray-400 tabular-nums">
              {formatNumber(events.startingSoon)} start in the next {recentDays} days
            </p>
          }
        />
        <SegmentedTotalChart
          title="Attendance"
          description="How your department's event registrations resolved."
          slices={attendanceSlices}
          aside={
            <ChartFigure
              value={formatNumber(attendance.serviceHours)}
              label="service hours credited"
            />
          }
        />
        <SegmentedTotalChart
          title="Monthly reports"
          description="Your submissions, by where each one stands with the director."
          slices={reportSlices}
          aside={
            <ChartFigure value={formatNumber(reportsSubmitted)} label="submitted" />
          }
        />
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <RateGauge
          title="Report approval"
          description="Submissions the director has approved."
          value={reports.approved}
          total={reportsSubmitted}
          caption="department reports approved"
          color={OVERVIEW_GAUGE_COLOR.approval}
        />
        <RateGauge
          title="Volunteer growth"
          description={`Volunteers who joined your department in the last ${recentDays} days.`}
          value={overview.newVolunteers}
          total={overview.volunteers}
          caption={`of ${formatNumber(overview.volunteers)} department volunteers`}
          color={OVERVIEW_GAUGE_COLOR.growth}
        />
      </div>

      <RecentActivityChart
        recentDays={recentDays}
        rows={[
          { label: 'Events starting', value: events.startingSoon },
          { label: 'New volunteers', value: overview.newVolunteers },
          { label: 'Attendance', value: attendance.recentCompleted },
          { label: 'Reports submitted', value: reportsSubmitted },
        ]}
      />
    </>
  )
}
