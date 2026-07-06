import dayjs from 'dayjs'
import type { EventCategory, EventStatus } from '../types/event'
import { BookOpen, Droplets, Heart, Package, Shirt, Stethoscope, Utensils } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export const EVENT_CATEGORIES: EventCategory[] = [
  'School',
  'Community',
  'Emergency',
  'Donation Drive',
  'Charity',
  'Relief Program',
  'Health',
  'Outreach',
  'Training',
  'Seminar',
  'Others',
]

export const EVENT_STATUSES: EventStatus[] = [
  'Upcoming',
  'Ongoing',
  'Completed',
  'Cancelled',
]

/** Sentinel department value meaning the event applies to every department. */
export const ALL_DEPARTMENTS = 'All Departments'

/** Departments (and their courses) offered — source of truth for the dropdown. */
export const DEPARTMENT_COURSES: Record<string, string[]> = {
  'College of Teacher Education': [
    'BSED - Bachelor of Secondary Education',
    'BEED - Bachelor of Elementary Education',
    'BTLEd - Bachelor of Technology and Livelihood Education',
  ],
  'College of Hospitality & Tourism Management': [
    'BSHM - Bachelor of Science in Hospitality Management',
    'BSTM - Bachelor of Science in Tourism Management',
  ],
  'College of Computer Studies': [
    'BSIT - Bachelor of Science in Information Technology',
    'BSCS - Bachelor of Science in Computer Science',
  ],
  'College of Nursing': ['BSN - Bachelor of Science in Nursing'],
  'College of Maritime': [
    'BSMarE - Bachelor of Science in Marine Engineering',
    'BSMT - Bachelor of Science in Marine Transportation',
  ],
  'College of Business Administration': [
    'BSBA-Marketing - Bachelor of Science in Business Administration Major in Marketing',
    'BSBA-HRM - Bachelor of Science in Business Administration Major in HRM',
  ],
  'College of Customs Administration': [
    'BSCA - Bachelor of Science in Customs Administration',
  ],
  'College of Business & Accountancy': [
    'BSBA - Bachelor of Science in Business Administration',
    'BSA - Bachelor of Science in Accountancy',
  ],
  'College of Engineering': [
    'BSCpE - Bachelor of Science in Computer Engineering',
    'BSEE - Bachelor of Science in Electrical Engineering',
    'BSCE - Bachelor of Science in Civil Engineering',
  ],
  'Senior High Department': [
    'STEM - Science, Technology, Engineering, and Mathematics',
    'ABM - Accountancy, Business, and Management',
    'HUMSS - Humanities and Social Sciences',
    'GAS - General Academic Strand',
    'ICT - Information and Communications Technology',
    'HE - Home Economics',
    'IA - Industrial Arts',
  ],
}

export const EVENT_DEPARTMENTS = Object.keys(DEPARTMENT_COURSES)

/** Event image upload limits. */
export const EVENT_IMAGE_MAX_COUNT = 3
export const EVENT_IMAGE_MAX_BYTES = 3 * 1024 * 1024 // 3MB

const MINUTES_PER_HOUR = 60
const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR
const EVENT_DATETIME_FORMAT = 'MMM D, YYYY · h:mm A'

export interface EventDurationSummary {
  /** Total duration expressed in hours (e.g. 36.5). */
  totalHours: number
  /** e.g. "36.5 hours" or "45 minutes". */
  totalHoursLabel: string
  /** Human breakdown, e.g. "1 day and a half" or "3 hours 30 minutes". */
  friendlyLabel: string
  /** Whether the event spans more than one calendar duration (>= 24h). */
  spansMultipleDays: boolean
  /** Formatted start, e.g. "Jul 3, 2026 · 8:00 AM". */
  startLabel: string
  /** Formatted end. */
  endLabel: string
}

function pluralize(value: number, unit: string): string {
  return `${value} ${unit}${value === 1 ? '' : 's'}`
}

/**
 * Compute a friendly duration summary between two datetime-local strings.
 * Returns null when either bound is missing or the range is not positive.
 */
export function summarizeEventDuration(
  start?: string,
  end?: string,
): EventDurationSummary | null {
  if (!start || !end) return null
  const startDate = dayjs(start)
  const endDate = dayjs(end)
  if (!startDate.isValid() || !endDate.isValid()) return null

  const totalMinutes = endDate.diff(startDate, 'minute')
  if (totalMinutes <= 0) return null

  const totalHours = Math.round((totalMinutes / MINUTES_PER_HOUR) * 100) / 100
  const days = Math.floor(totalMinutes / MINUTES_PER_DAY)
  const remainingMinutes = totalMinutes % MINUTES_PER_DAY
  const hours = Math.floor(remainingMinutes / MINUTES_PER_HOUR)
  const minutes = remainingMinutes % MINUTES_PER_HOUR

  let friendlyLabel: string
  if (days >= 1) {
    // Treat an exact 12-hour remainder as "and a half" for a natural phrase.
    if (hours === 12 && minutes === 0) {
      friendlyLabel = `${pluralize(days, 'day')} and a half`
    } else {
      const parts = [pluralize(days, 'day')]
      if (hours > 0) parts.push(pluralize(hours, 'hour'))
      if (minutes > 0) parts.push(pluralize(minutes, 'minute'))
      friendlyLabel = parts.join(' ')
    }
  } else if (hours >= 1) {
    friendlyLabel =
      minutes > 0
        ? `${pluralize(hours, 'hour')} ${pluralize(minutes, 'minute')}`
        : pluralize(hours, 'hour')
  } else {
    friendlyLabel = pluralize(minutes, 'minute')
  }

  const totalHoursLabel =
    totalMinutes < MINUTES_PER_HOUR
      ? pluralize(minutes, 'minute')
      : `${totalHours % 1 === 0 ? totalHours : totalHours.toFixed(1)} hours`

  return {
    totalHours,
    totalHoursLabel,
    friendlyLabel,
    spansMultipleDays: days >= 1,
    startLabel: startDate.format(EVENT_DATETIME_FORMAT),
    endLabel: endDate.format(EVENT_DATETIME_FORMAT),
  }
}

export interface GoodsTypeOption {
  id: string
  name: string
  icon: LucideIcon
  color: string
  borderColor: string
  bgColor: string
}

export const GOODS_TYPE_OPTIONS: GoodsTypeOption[] = [
  {
    id: 'food',
    name: 'Food',
    icon: Utensils,
    color: 'text-orange-600',
    borderColor: 'border-orange-400',
    bgColor: 'bg-orange-50',
  },
  {
    id: 'clothing',
    name: 'Clothing',
    icon: Shirt,
    color: 'text-blue-600',
    borderColor: 'border-blue-400',
    bgColor: 'bg-blue-50',
  },
  {
    id: 'medicine',
    name: 'Medicine',
    icon: Stethoscope,
    color: 'text-red-600',
    borderColor: 'border-red-400',
    bgColor: 'bg-red-50',
  },
  {
    id: 'books',
    name: 'Books',
    icon: BookOpen,
    color: 'text-purple-600',
    borderColor: 'border-purple-400',
    bgColor: 'bg-purple-50',
  },
  {
    id: 'hygiene',
    name: 'Hygiene',
    icon: Droplets,
    color: 'text-cyan-600',
    borderColor: 'border-cyan-400',
    bgColor: 'bg-cyan-50',
  },
  {
    id: 'supplies',
    name: 'Supplies',
    icon: Package,
    color: 'text-gray-600',
    borderColor: 'border-gray-400',
    bgColor: 'bg-gray-50',
  },
  {
    id: 'other',
    name: 'Other',
    icon: Heart,
    color: 'text-pink-600',
    borderColor: 'border-pink-400',
    bgColor: 'bg-pink-50',
  },
]

export const DEFAULT_MAP_CENTER: [number, number] = [123.8854, 10.3157]
