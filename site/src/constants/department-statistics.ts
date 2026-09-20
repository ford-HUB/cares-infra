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

/** The "every category" choice in the category filter. */
export const STATISTICS_CATEGORY_ALL = 'all'

/** The "every department" choice in the director-level department filter. */
export const STATISTICS_DEPARTMENT_ALL = 'all'

/**
 * The UCLM departments the statistics report over, in display order. Mirrors
 * `UclmDepartments.names` in the mobile app (mobile/lib/core/constants/uclm_departments.dart)
 * so a coordinator's profile department matches a row here by name.
 */
export const STATISTICS_DEPARTMENTS: readonly string[] = [
  'College of Teacher Education',
  'College of Hospitality & Tourism Management',
  'College of Computer Studies',
  'College of Nursing',
  'College of Maritime',
  'College of Business Administration',
  'College of Customs Administration',
  'College of Bussines & Accountancy',
  'College of Engeneering',
  'Senior High Department',
]

/**
 * Chart colour, by the job it does. Two-series charts take the validated categorical
 * pair; a single-series chart takes the brand hue; status charts spend colour on
 * state only, and always ship with a legend so identity is never colour alone.
 */
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

/** Recessive grid and crosshair — the marks carry the data, the frame stays quiet. */
export const STATISTICS_GRID_STROKE = '#f3f4f6'
export const STATISTICS_CURSOR_STROKE = '#d1d5db'

export const STATISTICS_CHART_HEIGHT = 'h-64'
export const STATISTICS_SMALL_CHART_HEIGHT = 'h-52'
/** One row per department, so the horizontal bar chart grows with the department list. */
export const STATISTICS_DEPARTMENT_CHART_HEIGHT = 'h-96'
/** Y-axis width that fits the longest department name at the tick font size. */
export const STATISTICS_DEPARTMENT_AXIS_WIDTH = 240

/** Rows the "top events" table shows — enough to rank, not a full list. */
export const STATISTICS_TOP_EVENTS = 6

/** Filename the CSV export saves as, with the range appended. */
export const STATISTICS_EXPORT_FILENAME = 'department-statistics'
