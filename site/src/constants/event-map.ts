import type { EventStatus } from '../types/event'
import { EVENT_STATUSES } from './event'

export const EVENT_MAP_HEIGHT_CLASS = 'h-[calc(100vh-13rem)] min-h-[26rem]'

export const EVENT_MAP_STATUS_FILTERS = [
  { value: 'all', label: 'All statuses' },
  { value: 'Upcoming', label: 'Upcoming' },
  { value: 'Ongoing', label: 'Ongoing' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Cancelled', label: 'Cancelled' },
] as const

export type EventMapStatusFilter = (typeof EVENT_MAP_STATUS_FILTERS)[number]['value']

export const EVENT_PIN_ACCENTS: Record<EventStatus, string> = {
  Upcoming: '#7c3aed',
  Ongoing: '#16a34a',
  Completed: '#4b5563',
  Cancelled: '#dc2626',
}

export const EVENT_MAP_LEGEND = EVENT_STATUSES.map((status) => ({
  status,
  color: EVENT_PIN_ACCENTS[status],
}))
