import type { AuditLogCategory, AuditLogOutcome } from './audit-log'

/** Every account the platform holds, split by the role it signed up as. */
export interface CommunityCounts {
  volunteers: number
  /** Volunteers whose ID + face check has passed. */
  verifiedVolunteers: number
  beneficiaries: number
  donors: number
  /** Admin, director and coordinator accounts together. */
  staff: number
  /** Volunteer accounts created inside the recent window. */
  newVolunteers: number
}

export interface EventCounts {
  total: number
  upcoming: number
  ongoing: number
  completed: number
  cancelled: number
  /** Upcoming events that start inside the recent window. */
  startingSoon: number
}

/** One row per volunteer per event: every registration, and how it was judged. */
export interface AttendanceCounts {
  registrations: number
  completed: number
  pending: number
  absent: number
  /** Credited service hours across every completed row. */
  serviceHours: number
  /** Rows judged completed inside the recent window. */
  recentCompleted: number
}

/** What is waiting on a person — the counts that should be zero by end of day. */
export interface QueueCounts {
  reportsUnderReview: number
  openSupportTickets: number
  certificatesDistributing: number
}

export interface ActivityEntry {
  id: string
  description: string
  actorName: string
  category: AuditLogCategory
  outcome: AuditLogOutcome
  createdAt: string
}

export interface AdminOverviewData {
  /** How far back "recent" reaches, in days — the server decides, the copy repeats it. */
  recentDays: number
  community: CommunityCounts
  events: EventCounts
  attendance: AttendanceCounts
  queues: QueueCounts
  activity: ActivityEntry[]
  generatedAt: string
}

/** The coordinator's own submissions, by where each one stands. */
export interface ReportCounts {
  underReview: number
  approved: number
  returned: number
}

export interface DepartmentOverviewData {
  recentDays: number
  /** The coordinator's college as it reads on their profile; null when unassigned. */
  department: string | null
  /** Volunteers whose school record files under this college. */
  volunteers: number
  newVolunteers: number
  events: EventCounts
  attendance: AttendanceCounts
  reports: ReportCounts
  generatedAt: string
}

export type OverviewData = AdminOverviewData | DepartmentOverviewData

export function isAdminOverview(data: OverviewData): data is AdminOverviewData {
  return 'community' in data
}

export function isDepartmentOverview(data: OverviewData): data is DepartmentOverviewData {
  return 'reports' in data
}
