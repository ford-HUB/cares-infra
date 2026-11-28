import type { EventCategory, EventStatus } from './event'

export type CalendarView = 'month' | 'week' | 'day'

export interface CalendarEvent {
  id: string
  title: string
  category: EventCategory
  status: EventStatus
  location: string
  organizer: string
  department?: string
  start: string
  end: string
  allDay: boolean
  participants: number
  maxParticipants: number
}

/** Overlapping events split the column, so each block carries its slot. */
export interface PositionedCalendarEvent {
  event: CalendarEvent
  /** Pixels. */
  top: number
  /** Pixels. */
  height: number
  column: number
  columns: number
}
