/** Months. */
export type StatisticsRange = '3m' | '6m' | '12m'

export type AttendanceOutcome = 'completed' | 'pending' | 'absent'
export type ReportOutcome = 'approved' | 'underReview' | 'returned'

export interface StatisticSummary {
  value: number
  /** Null when there is nothing to compare to. */
  previous: number | null
  /** One point per month, oldest first. */
  trend: number[]
}

export interface MonthlyActivity {
  /** `YYYY-MM` grouping key; `label` is what the axis shows. */
  period: string
  label: string
  eventsHeld: number
  registrations: number
  attended: number
  serviceHours: number
}

export interface CategoryActivity {
  category: string
  events: number
  registrations: number
  outcomes: Record<AttendanceOutcome, number>
}

export interface MonthlyReportActivity {
  period: string
  label: string
  outcomes: Record<ReportOutcome, number>
}

export interface YearLevelParticipation {
  yearLevel: string
  volunteers: number
  /** At least one completed attendance in the period. */
  active: number
}

export interface DepartmentActivity {
  department: string
  events: number
  registrations: number
  attended: number
  serviceHours: number
}

export interface TopEvent {
  id: string
  title: string
  category: string
  date: string
  registrations: number
  attended: number
  serviceHours: number
}

export interface DepartmentStatistics {
  /** Null means every department. */
  department: string | null
  range: StatisticsRange
  summary: {
    eventsHeld: StatisticSummary
    activeVolunteers: StatisticSummary
    attendanceRate: StatisticSummary
    serviceHours: StatisticSummary
  }
  monthly: MonthlyActivity[]
  categories: CategoryActivity[]
  reports: MonthlyReportActivity[]
  yearLevels: YearLevelParticipation[]
  topEvents: TopEvent[]
  /** Only present when the scope is every department. */
  departments: DepartmentActivity[]
  generatedAt: string
}
