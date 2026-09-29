import type { EventCategory, EventStatus } from './event'

/** Which grid the calendar draws — the toolbar switches between the three. */
export type CalendarView = 'month' | 'week' | 'day'

/** One scheduled event reduced to what a calendar cell needs to draw it. */
export interface CalendarEvent {
  id: string
  title: string
  category: EventCategory
  status: EventStatus
  location: string
  organizer: string
  department?: string
  /** ISO datetime — the grid positions the block from these two bounds. */
  start: string
  end: string
  /** Rendered in the all-day rail instead of the time grid. */
  allDay: boolean
  participants: number
  maxParticipants: number
}

/**
 * A timed event placed in one day column. Overlapping events split the column
 * width between them, so each block carries its own slot within that day.
 */
export interface PositionedCalendarEvent {
  event: CalendarEvent
  /** Offset from the top of the grid, in pixels. */
  top: number
  /** Block height, in pixels. */
  height: number
  /** Column index among events it overlaps. */
  column: number
  /** How many columns that overlap group was split into. */
  columns: number
}
