import {
  ATTENDANCE_OUTCOME_COLOR,
  ATTENDANCE_OUTCOME_LABELS,
  ATTENDANCE_OUTCOME_ORDER,
} from '../../constants/department-statistics'
import { formatNumber } from '../../constants/formatting'
import {
  COMMUNITY_SEGMENT_COLOR,
  COMMUNITY_SEGMENT_LABELS,
  COMMUNITY_SEGMENT_ORDER,
  EVENT_STATE_COLOR,
  EVENT_STATE_LABELS,
  EVENT_STATE_ORDER,
  OVERVIEW_GAUGE_COLOR,
} from '../../constants/overview'
import type { AdminOverviewData } from '../../types/overview'
import { ResidentialNeedsModuleCard } from '../residential-needs/residential-needs-module-card'
import { ChartFigure } from '../statistics/ui/chart-card'
import { CompositionDonut } from './ui/composition-donut'
import { RateGauge } from './ui/rate-gauge'
import { RecentActivityChart } from './ui/recent-activity-chart'
import { SegmentedTotalChart } from './ui/segmented-total-chart'
import type { OverviewSlice } from './ui/overview-slice'

interface AdminOverviewProps {
  overview: AdminOverviewData
  /** The director also gets the residential-needs band above the charts. */
  isDirector: boolean
}

/**
 * The system overview as charts: three part-to-whole cards for who the platform holds,
 * where its events stand, and how registrations resolved; three gauges for the rates
 * those totals imply; and the recent window as one bar chart.
 */
export function AdminOverview({ overview, isDirector }: AdminOverviewProps) {
  const { community, events, attendance, recentDays } = overview

  const communitySlices: OverviewSlice[] = COMMUNITY_SEGMENT_ORDER.map((segment) => ({
    key: segment,
    label: COMMUNITY_SEGMENT_LABELS[segment],
    value: community[segment],
    color: COMMUNITY_SEGMENT_COLOR[segment],
  }))

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

  return (
    <>
      {isDirector && (
        <div className="mb-4">
          <ResidentialNeedsModuleCard />
        </div>
      )}

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <CompositionDonut
          title="Community"
          description="Every account the platform holds, by the role it signed up as."
          slices={communitySlices}
          centreLabel="total users"
        />
        <SegmentedTotalChart
          title="Events"
          description="Where each event in the system currently stands."
          slices={eventSlices}
          aside={<ChartFigure value={formatNumber(events.total)} label="events" />}
        />
        <SegmentedTotalChart
          title="Attendance"
          description="How every event registration resolved."
          slices={attendanceSlices}
          aside={
            <ChartFigure
              value={formatNumber(attendance.serviceHours)}
              label="service hours credited"
            />
          }
        />
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <RateGauge
          title="Volunteer verification"
          description="Volunteers whose ID and face check has passed."
          value={community.verifiedVolunteers}
          total={community.volunteers}
          caption="volunteers verified"
          color={OVERVIEW_GAUGE_COLOR.verification}
        />
        <RateGauge
          title="Event completion"
          description="Events that ran to completion, against every event held."
          value={events.completed}
          total={events.total}
          caption="events completed"
          color={OVERVIEW_GAUGE_COLOR.completion}
        />
        <RateGauge
          title="Volunteer growth"
          description={`Volunteers who joined in the last ${recentDays} days.`}
          value={community.newVolunteers}
          total={community.volunteers}
          caption={`of the roster joined in ${recentDays} days`}
          color={OVERVIEW_GAUGE_COLOR.growth}
        />
      </div>

      <RecentActivityChart
        recentDays={recentDays}
        rows={[
          { label: 'Events starting', value: events.startingSoon },
          { label: 'New volunteers', value: community.newVolunteers },
          { label: 'Attendance', value: attendance.recentCompleted },
          { label: 'Completed events', value: events.completed },
        ]}
      />
    </>
  )
}
