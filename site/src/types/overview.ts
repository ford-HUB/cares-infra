import type { AuditLogCategory, AuditLogOutcome } from './audit-log'

export interface CommunityCounts {
  volunteers: number
  /** ID + face check passed. */
  verifiedVolunteers: number
  beneficiaries: number
  donors: number
  staff: number
  newVolunteers: number
}

export interface EventCounts {
  total: number
  upcoming: number
  ongoing: number
  completed: number
  cancelled: number
  startingSoon: number
}

/** One row per volunteer per event. */
export interface AttendanceCounts {
  registrations: number
  completed: number
  pending: number
  absent: number
  serviceHours: number
  recentCompleted: number
}

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
  /** Days; decided by the server. */
  recentDays: number
  community: CommunityCounts
  events: EventCounts
  attendance: AttendanceCounts
  queues: QueueCounts
  activity: ActivityEntry[]
  generatedAt: string
}

export interface ReportCounts {
  underReview: number
  approved: number
  returned: number
}

export interface DepartmentOverviewData {
  recentDays: number
  /** As on the profile; null when unassigned. */
  department: string | null
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

export type EventState = 'upcoming' | 'ongoing' | 'completed' | 'cancelled'

export type CommunitySegment = 'volunteers' | 'beneficiaries' | 'donors' | 'staff'
