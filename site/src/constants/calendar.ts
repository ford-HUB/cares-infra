import type { CalendarView } from '../types/calendar'
import type { EventCategory } from '../types/event'

export const CALENDAR_VIEWS: { value: CalendarView; label: string }[] = [
  { value: 'month', label: 'Month' },
  { value: 'week', label: 'Week' },
  { value: 'day', label: 'Day' },
]

/** Events outside the working span clamp to the edges. */
export const CALENDAR_START_HOUR = 6
export const CALENDAR_END_HOUR = 21

/** All block offsets derive from this. */
export const CALENDAR_HOUR_HEIGHT_PX = 44

export const CALENDAR_HOURS = Array.from(
  { length: CALENDAR_END_HOUR - CALENDAR_START_HOUR },
  (_, index) => CALENDAR_START_HOUR + index,
)

export const CALENDAR_GRID_HEIGHT_PX = CALENDAR_HOURS.length * CALENDAR_HOUR_HEIGHT_PX

export const CALENDAR_MIN_BLOCK_HEIGHT_PX = 20

export const CALENDAR_GUTTER_WIDTH = '3.25rem'

/** Overlapping blocks draw wider than their slot so titles stay readable; keep modest. */
export const CALENDAR_BLOCK_SPREAD = 1.4

export const MONTH_CELL_VISIBLE_EVENTS = 3

export const MONTH_GRID_WEEKS = 6
export const DAYS_PER_WEEK = 7

export const CALENDAR_WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export const CALENDAR_DATE_FORMATS = {
  monthTitle: 'MMMM YYYY',
  dayTitle: 'dddd, MMMM D, YYYY',
  weekdayShort: 'ddd',
  dayNumber: 'D',
  time: 'h:mm A',
  hourLabel: 'h A',
  rangeSameMonth: 'MMM D',
  rangeDay: 'D, YYYY',
  fullDate: 'MMM D, YYYY',
} as const

export interface CalendarCategoryTint {
  block: string
  bar: string
  chip: string
  dot: string
}

export const CALENDAR_CATEGORY_TINTS: Record<EventCategory, CalendarCategoryTint> = {
  School: {
    block: 'bg-blue-50 text-blue-900 hover:bg-blue-100',
    bar: 'bg-blue-500',
    chip: 'bg-blue-50 text-blue-800',
    dot: 'bg-blue-500',
  },
  Community: {
    block: 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100',
    bar: 'bg-emerald-500',
    chip: 'bg-emerald-50 text-emerald-800',
    dot: 'bg-emerald-500',
  },
  Emergency: {
    block: 'bg-red-50 text-red-900 hover:bg-red-100',
    bar: 'bg-red-500',
    chip: 'bg-red-50 text-red-800',
    dot: 'bg-red-500',
  },
  'Donation Drive': {
    block: 'bg-amber-50 text-amber-900 hover:bg-amber-100',
    bar: 'bg-amber-500',
    chip: 'bg-amber-50 text-amber-800',
    dot: 'bg-amber-500',
  },
  Charity: {
    block: 'bg-pink-50 text-pink-900 hover:bg-pink-100',
    bar: 'bg-pink-500',
    chip: 'bg-pink-50 text-pink-800',
    dot: 'bg-pink-500',
  },
  'Relief Program': {
    block: 'bg-orange-50 text-orange-900 hover:bg-orange-100',
    bar: 'bg-orange-500',
    chip: 'bg-orange-50 text-orange-800',
    dot: 'bg-orange-500',
  },
  Health: {
    block: 'bg-teal-50 text-teal-900 hover:bg-teal-100',
    bar: 'bg-teal-500',
    chip: 'bg-teal-50 text-teal-800',
    dot: 'bg-teal-500',
  },
  Outreach: {
    block: 'bg-violet-50 text-violet-900 hover:bg-violet-100',
    bar: 'bg-violet-500',
    chip: 'bg-violet-50 text-violet-800',
    dot: 'bg-violet-500',
  },
  Training: {
    block: 'bg-indigo-50 text-indigo-900 hover:bg-indigo-100',
    bar: 'bg-indigo-500',
    chip: 'bg-indigo-50 text-indigo-800',
    dot: 'bg-indigo-500',
  },
  Seminar: {
    block: 'bg-cyan-50 text-cyan-900 hover:bg-cyan-100',
    bar: 'bg-cyan-500',
    chip: 'bg-cyan-50 text-cyan-800',
    dot: 'bg-cyan-500',
  },
  Others: {
    block: 'bg-gray-50 text-gray-900 hover:bg-gray-100',
    bar: 'bg-gray-400',
    chip: 'bg-gray-100 text-gray-700',
    dot: 'bg-gray-400',
  },
}

export const CALENDAR_CATEGORY_FILTER_ALL = 'all'
