import dayjs from 'dayjs'
import type { CalendarEvent } from '../types/calendar'
import type { CaresEvent } from '../types/event'
import type { ApiResponse } from '../types/portal-roles'
import { listEvents } from './event-service'

/**
 * An event is drawn in the all-day rail rather than the time grid when it covers
 * whole days — either it runs past midnight into another day, or it fills the
 * entire drawn span of a single one. Blocks like that would otherwise stretch
 * the full column height and bury every timed event behind them.
 */
function isAllDay(event: CaresEvent): boolean {
  const start = dayjs(event.event_started)
  const end = dayjs(event.event_ended)
  if (!start.isValid() || !end.isValid()) return false
  return !start.isSame(end, 'day') || end.diff(start, 'hour') >= 24
}

function toCalendarEvent(event: CaresEvent): CalendarEvent {
  return {
    id: String(event.event_id),
    title: event.title,
    category: event.category,
    status: event.status,
    location: event.location,
    organizer: event.organizer_name,
    department: event.department,
    start: event.event_started,
    end: event.event_ended,
    allDay: isAllDay(event),
    participants: event.participants,
    maxParticipants: event.max_participants,
  }
}

/**
 * Every scheduled event, reduced to what a calendar cell needs. Reads the same
 * `/events` endpoint Manage Event does — including its derived live status — so
 * the two screens can never disagree about what is ongoing.
 */
export async function listCalendarEvents(): Promise<ApiResponse<CalendarEvent[]>> {
  const res = await listEvents()

  if (!res.success) {
    return { success: false, message: res.message, data: null }
  }

  return { success: true, data: res.data.map(toCalendarEvent) }
}
