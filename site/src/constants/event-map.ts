import type { EventStatus } from '../types/event'
import { EVENT_STATUSES } from './event'

/** Height of the event map frame — shared by the map and its loading skeleton. */
export const EVENT_MAP_HEIGHT_CLASS = 'h-[calc(100vh-13rem)] min-h-[26rem]'

/** Status filters offered above the map, in the order they are shown. */
export const EVENT_MAP_STATUS_FILTERS = [
  { value: 'all', label: 'All statuses' },
  { value: 'Upcoming', label: 'Upcoming' },
  { value: 'Ongoing', label: 'Ongoing' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Cancelled', label: 'Cancelled' },
] as const

export type EventMapStatusFilter = (typeof EVENT_MAP_STATUS_FILTERS)[number]['value']

/**
 * Pin colour per status, so the map reads at a glance without opening a card.
 * The legend below is derived from this — one source of truth for both.
 */
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
