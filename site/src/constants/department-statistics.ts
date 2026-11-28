import type {
  AttendanceOutcome,
  ReportOutcome,
  StatisticsRange,
} from '../types/department-statistics'

export const STATISTICS_DEFAULT_RANGE: StatisticsRange = '6m'

export const STATISTICS_RANGE_OPTIONS: { value: StatisticsRange; label: string }[] = [
  { value: '3m', label: '3 months' },
  { value: '6m', label: '6 months' },
  { value: '12m', label: '12 months' },
]

export const STATISTICS_RANGE_MONTHS: Record<StatisticsRange, number> = {
  '3m': 3,
  '6m': 6,
  '12m': 12,
}

export const STATISTICS_CATEGORY_ALL = 'all'

export const STATISTICS_DEPARTMENT_ALL = 'all'

/** Mirrors mobile `UclmDepartments.names` so profile departments match by name. */
export const STATISTICS_DEPARTMENTS: readonly string[] = [
  'College of Maritime Engineering',
  'College of Teacher Education (BSED)',
  'College of Maritime Transportation',
  'College of Nursing',
  'Senior High School Department',
  'College of Teacher Education (BEED)',
  'College of Business and Accountancy',
  'College of Computer Studies',
  'College of Criminology',
  'College of Customs Administration',
  'College of Engineering',
  'College of Hospitality and Tourism Management',
  'Basic Education (Junior High School)',
  'Basic Education (Elementary)',
  'Non-Teaching Personnel',
]

export const STATISTICS_SERIES_COLOR = {
  registrations: '#2a78d6',
  attended: '#1baf7a',
  single: '#2d6a4f',
  previous: '#d1d5db',
} as const

export const ATTENDANCE_OUTCOME_ORDER: AttendanceOutcome[] = [
  'completed',
  'pending',
  'absent',
]

export const ATTENDANCE_OUTCOME_LABELS: Record<AttendanceOutcome, string> = {
  completed: 'Completed',
  pending: 'Pending',
  absent: 'Absent',
}

export const ATTENDANCE_OUTCOME_COLOR: Record<AttendanceOutcome, string> = {
  completed: '#059669',
  pending: '#d97706',
  absent: '#9ca3af',
}

export const REPORT_OUTCOME_ORDER: ReportOutcome[] = [
  'approved',
  'underReview',
  'returned',
]

export const REPORT_OUTCOME_LABELS: Record<ReportOutcome, string> = {
  approved: 'Approved',
  underReview: 'Under review',
  returned: 'Returned',
}

export const REPORT_OUTCOME_COLOR: Record<ReportOutcome, string> = {
  approved: '#059669',
  underReview: '#9ca3af',
  returned: '#d97706',
}

export const STATISTICS_GRID_STROKE = '#f3f4f6'
export const STATISTICS_CURSOR_STROKE = '#d1d5db'

export const STATISTICS_CHART_HEIGHT = 'h-64'
export const STATISTICS_SMALL_CHART_HEIGHT = 'h-52'
export const STATISTICS_DEPARTMENT_CHART_HEIGHT = 'h-96'
export const STATISTICS_DEPARTMENT_AXIS_WIDTH = 240

export const STATISTICS_TOP_EVENTS = 6
