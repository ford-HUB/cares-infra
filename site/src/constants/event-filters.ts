import dayjs from 'dayjs'
import isBetween from 'dayjs/plugin/isBetween'
import type { CaresEvent, EventStatus } from '../types/event'

dayjs.extend(isBetween)

/** Time-range filter for the events table. */
export type EventTimeFilter = 'all' | 'today' | 'this_week' | 'this_month' | 'past' | 'future'

export const EVENT_TIME_FILTERS: { value: EventTimeFilter; label: string }[] = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'this_week', label: 'This Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'past', label: 'Past Events' },
  { value: 'future', label: 'Future Events' },
]

/**
 * Status filter for the events table.
 * `active` = Upcoming + Ongoing (events that are not finished or cancelled).
 */
export type EventStatusFilter = 'all' | 'active' | EventStatus

export const EVENT_STATUS_FILTERS: { value: EventStatusFilter; label: string }[] = [
  { value: 'all', label: 'All Status' },
  { value: 'active', label: 'Active Events' },
  { value: 'Ongoing', label: 'Ongoing' },
  { value: 'Upcoming', label: 'Upcoming' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Cancelled', label: 'Cancelled' },
]

/** Recompute status from start/end timestamps (respects Cancelled). */
export function deriveEventStatus(
  start: string,
  end: string,
  stored?: EventStatus,
): EventStatus {
  if (stored === 'Cancelled') return 'Cancelled'
  const now = Date.now()
  const s = new Date(start).getTime()
  const e = new Date(end).getTime()
  if (now < s) return 'Upcoming'
  if (now >= s && now <= e) return 'Ongoing'
  return 'Completed'
}

export function matchesEventTimeFilter(
  event: Pick<CaresEvent, 'event_started' | 'event_ended'>,
  filter: EventTimeFilter,
): boolean {
  if (filter === 'all') return true
  const start = dayjs(event.event_started)
  const now = dayjs()

  switch (filter) {
    case 'today':
      return start.isSame(now, 'day')
    case 'this_week':
      return start.isBetween(now.startOf('week'), now.endOf('week'), 'day', '[]')
    case 'this_month':
      return start.isSame(now, 'month')
    case 'past':
      return dayjs(event.event_ended).isBefore(now)
    case 'future':
      return start.isAfter(now)
    default:
      return true
  }
}

export function matchesEventStatusFilter(
  status: EventStatus,
  filter: EventStatusFilter,
): boolean {
  if (filter === 'all') return true
  if (filter === 'active') return status === 'Upcoming' || status === 'Ongoing'
  return status === filter
}
