import type { AuditLogOutcome } from '../types/audit-log'
import type {
  ActivityEntry,
  AdminOverviewData,
  AttendanceCounts,
  DepartmentOverviewData,
  EventCounts,
} from '../types/overview'
import type { ApiResponse } from '../types/portal-roles'
import { apiClient, parseApiError } from './api-client'
import { CATEGORY_FROM_API } from './audit-log-service'

interface EventCountsApiResponse {
  total: number
  upcoming: number
  ongoing: number
  completed: number
  cancelled: number
  starting_soon: number
}

interface AttendanceCountsApiResponse {
  registrations: number
  completed: number
  pending: number
  absent: number
  service_hours: number
  recent_completed: number
}

interface ActivityEntryApiResponse {
  audit_log_id: string
  description: string
  actor_name: string
  category: string
  outcome: string
  created_at: string
}

interface AdminOverviewApiResponse {
  recent_days: number
  community: {
    volunteers: number
    verified_volunteers: number
    beneficiaries: number
    donors: number
    staff: number
    new_volunteers: number
  }
  events: EventCountsApiResponse
  attendance: AttendanceCountsApiResponse
  queues: {
    reports_under_review: number
    open_support_tickets: number
    certificates_distributing: number
  }
  activity: ActivityEntryApiResponse[]
  generated_at: string
}

interface DepartmentOverviewApiResponse {
  recent_days: number
  department: string | null
  volunteers: number
  new_volunteers: number
  events: EventCountsApiResponse
  attendance: AttendanceCountsApiResponse
  reports: {
    under_review: number
    approved: number
    returned: number
  }
  generated_at: string
}

function mapEvents(data: EventCountsApiResponse): EventCounts {
  return {
    total: data.total,
    upcoming: data.upcoming,
    ongoing: data.ongoing,
    completed: data.completed,
    cancelled: data.cancelled,
    startingSoon: data.starting_soon,
  }
}

function mapAttendance(data: AttendanceCountsApiResponse): AttendanceCounts {
  return {
    registrations: data.registrations,
    completed: data.completed,
    pending: data.pending,
    absent: data.absent,
    serviceHours: data.service_hours,
    recentCompleted: data.recent_completed,
  }
}

function mapActivity(data: ActivityEntryApiResponse): ActivityEntry {
  return {
    id: data.audit_log_id,
    description: data.description,
    actorName: data.actor_name,
    category: CATEGORY_FROM_API[data.category] ?? 'system',
    outcome: data.outcome.toLowerCase() as AuditLogOutcome,
    createdAt: data.created_at,
  }
}

function mapAdminOverview(data: AdminOverviewApiResponse): AdminOverviewData {
  return {
    recentDays: data.recent_days,
    community: {
      volunteers: data.community.volunteers,
      verifiedVolunteers: data.community.verified_volunteers,
      beneficiaries: data.community.beneficiaries,
      donors: data.community.donors,
      staff: data.community.staff,
      newVolunteers: data.community.new_volunteers,
    },
    events: mapEvents(data.events),
    attendance: mapAttendance(data.attendance),
    queues: {
      reportsUnderReview: data.queues.reports_under_review,
      openSupportTickets: data.queues.open_support_tickets,
      certificatesDistributing: data.queues.certificates_distributing,
    },
    activity: data.activity.map(mapActivity),
    generatedAt: data.generated_at,
  }
}

function mapDepartmentOverview(
  data: DepartmentOverviewApiResponse,
): DepartmentOverviewData {
  return {
    recentDays: data.recent_days,
    department: data.department,
    volunteers: data.volunteers,
    newVolunteers: data.new_volunteers,
    events: mapEvents(data.events),
    attendance: mapAttendance(data.attendance),
    reports: {
      underReview: data.reports.under_review,
      approved: data.reports.approved,
      returned: data.reports.returned,
    },
    generatedAt: data.generated_at,
  }
}

/** System-wide counts — the admin and director dashboard. */
export async function getAdminOverview(): Promise<ApiResponse<AdminOverviewData>> {
  try {
    const { data: body } = await apiClient.get<{
      ok: true
      data: AdminOverviewApiResponse
    }>('/api/v1/overview/admin')
    return { success: true, data: mapAdminOverview(body.data) }
  } catch (error) {
    return { success: false, message: parseApiError(error), data: null }
  }
}

/** The caller's own college — the server scopes it from their profile, not a query. */
export async function getDepartmentOverview(): Promise<
  ApiResponse<DepartmentOverviewData>
> {
  try {
    const { data: body } = await apiClient.get<{
      ok: true
      data: DepartmentOverviewApiResponse
    }>('/api/v1/overview/department')
    return { success: true, data: mapDepartmentOverview(body.data) }
  } catch (error) {
    return { success: false, message: parseApiError(error), data: null }
  }
}
