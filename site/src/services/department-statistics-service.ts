import {
  STATISTICS_DEPARTMENT_ALL,
  STATISTICS_DEPARTMENTS,
} from '../constants/department-statistics'
import { EVENT_CATEGORIES } from '../constants/event'
import type {
  CategoryActivity,
  DepartmentActivity,
  DepartmentStatistics,
  MonthlyActivity,
  MonthlyReportActivity,
  StatisticSummary,
  StatisticsRange,
  TopEvent,
  YearLevelParticipation,
} from '../types/department-statistics'
import type { ApiResponse } from '../types/portal-roles'
import { apiClient, parseApiError } from './api-client'

export interface DepartmentStatisticsQuery {
  range: StatisticsRange
  category: string
}

interface StatisticSummaryApiResponse {
  value: number
  previous: number | null
  trend: number[]
}

interface MonthlyActivityApiResponse {
  period: string
  label: string
  events_held: number
  registrations: number
  attended: number
  service_hours: number
}

interface CategoryActivityApiResponse {
  category: string
  events: number
  registrations: number
  outcomes: { completed: number; pending: number; absent: number }
}

interface MonthlyReportActivityApiResponse {
  period: string
  label: string
  outcomes: { approved: number; under_review: number; returned: number }
}

interface YearLevelParticipationApiResponse {
  year_level: string
  volunteers: number
  active: number
}

interface DepartmentActivityApiResponse {
  department: string
  events: number
  registrations: number
  attended: number
  service_hours: number
}

interface TopEventApiResponse {
  event_id: number
  title: string
  category: string
  date: string
  registrations: number
  attended: number
  service_hours: number
}

interface StatisticsApiResponse {
  department: string | null
  range: StatisticsRange
  summary: {
    events_held: StatisticSummaryApiResponse
    active_volunteers: StatisticSummaryApiResponse
    attendance_rate: StatisticSummaryApiResponse
    service_hours: StatisticSummaryApiResponse
  }
  monthly: MonthlyActivityApiResponse[]
  categories: CategoryActivityApiResponse[]
  reports: MonthlyReportActivityApiResponse[]
  year_levels: YearLevelParticipationApiResponse[]
  top_events: TopEventApiResponse[]
  departments: DepartmentActivityApiResponse[]
  generated_at: string
}

function mapSummary(data: StatisticSummaryApiResponse): StatisticSummary {
  return { value: data.value, previous: data.previous, trend: data.trend }
}

function mapMonthly(data: MonthlyActivityApiResponse): MonthlyActivity {
  return {
    period: data.period,
    label: data.label,
    eventsHeld: data.events_held,
    registrations: data.registrations,
    attended: data.attended,
    serviceHours: data.service_hours,
  }
}

function mapCategory(data: CategoryActivityApiResponse): CategoryActivity {
  return {
    category: data.category,
    events: data.events,
    registrations: data.registrations,
    outcomes: {
      completed: data.outcomes.completed,
      pending: data.outcomes.pending,
      absent: data.outcomes.absent,
    },
  }
}

function mapReport(data: MonthlyReportActivityApiResponse): MonthlyReportActivity {
  return {
    period: data.period,
    label: data.label,
    outcomes: {
      approved: data.outcomes.approved,
      underReview: data.outcomes.under_review,
      returned: data.outcomes.returned,
    },
  }
}

function mapYearLevel(data: YearLevelParticipationApiResponse): YearLevelParticipation {
  return { yearLevel: data.year_level, volunteers: data.volunteers, active: data.active }
}

function mapDepartment(data: DepartmentActivityApiResponse): DepartmentActivity {
  return {
    department: data.department,
    events: data.events,
    registrations: data.registrations,
    attended: data.attended,
    serviceHours: data.service_hours,
  }
}

function mapTopEvent(data: TopEventApiResponse): TopEvent {
  return {
    id: String(data.event_id),
    title: data.title,
    category: data.category,
    date: data.date,
    registrations: data.registrations,
    attended: data.attended,
    serviceHours: data.service_hours,
  }
}

function mapStatistics(data: StatisticsApiResponse): DepartmentStatistics {
  return {
    department: data.department,
    range: data.range,
    summary: {
      eventsHeld: mapSummary(data.summary.events_held),
      activeVolunteers: mapSummary(data.summary.active_volunteers),
      attendanceRate: mapSummary(data.summary.attendance_rate),
      serviceHours: mapSummary(data.summary.service_hours),
    },
    monthly: data.monthly.map(mapMonthly),
    categories: data.categories.map(mapCategory),
    reports: data.reports.map(mapReport),
    yearLevels: data.year_levels.map(mapYearLevel),
    topEvents: data.top_events.map(mapTopEvent),
    departments: data.departments.map(mapDepartment),
    generatedAt: data.generated_at,
  }
}

/**
 * `department` null reads the whole system — the admin and director view. A
 * coordinator passes their own college, though the server scopes them from their
 * profile regardless of what the query says.
 */
export async function getDepartmentStatistics(
  department: string | null,
  query: DepartmentStatisticsQuery,
): Promise<ApiResponse<DepartmentStatistics>> {
  try {
    const { data: body } = await apiClient.get<{
      ok: true
      data: StatisticsApiResponse
    }>('/api/v1/statistics', {
      params: {
        range: query.range,
        category: query.category,
        department: department ?? STATISTICS_DEPARTMENT_ALL,
      },
    })
    return { success: true, data: mapStatistics(body.data) }
  } catch (error) {
    return { success: false, message: parseApiError(error), data: null }
  }
}

/** Category choices for the filter — the same set the events form offers. */
export const DEPARTMENT_STATISTICS_CATEGORIES: readonly string[] = EVENT_CATEGORIES

/** Department choices for the director-level filter — the UCLM departments. */
export const DEPARTMENT_STATISTICS_DEPARTMENTS: readonly string[] = STATISTICS_DEPARTMENTS
