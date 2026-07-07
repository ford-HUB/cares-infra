export interface StaffOverviewData {
  stats: {
    totalVolunteers: number
    totalStudents: number
    totalEvents: number
    upcomingEvents: number
    ongoingEvents: number
    completedEvents: number
    totalBeneficiaries: number
    totalParticipants: number
    recentRegistrations: number
    totalAttendance: number
    recentAttendance: number
  }
  recentActivities: { id: string; label: string; time: string }[]
}

export interface DepartmentOverviewData {
  departmentName: string
  upcomingEvents: number
  pendingDocuments: number
  activeVolunteers: number
  monthlyCompletion: number
  pendingApprovals: number
  recentRegistrations: number
  recentAttendance: number
  recentSubmissions: number
}

export type OverviewData = StaffOverviewData | DepartmentOverviewData

export function isStaffOverview(data: OverviewData): data is StaffOverviewData {
  return 'stats' in data
}

export function isDepartmentOverview(
  data: OverviewData,
): data is DepartmentOverviewData {
  return 'departmentName' in data
}
