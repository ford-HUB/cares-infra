import dayjs, { type Dayjs } from 'dayjs'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CALENDAR_CATEGORY_FILTER_ALL,
  CALENDAR_DATE_FORMATS,
} from '../constants/calendar'
import { useCalendarStore } from '../store/calendar-store'
import type { CalendarEvent, CalendarView } from '../types/calendar'
import type { EventCategory } from '../types/event'
import { weekDays } from '../utils/calendar-layout'

export type CalendarCategoryFilter = EventCategory | typeof CALENDAR_CATEGORY_FILTER_ALL

/** The unit each view steps by, so Previous/Next means the same thing as the grid. */
const STEP_UNIT: Record<CalendarView, dayjs.ManipulateType> = {
  month: 'month',
  week: 'week',
  day: 'day',
}

function rangeLabel(cursor: Dayjs, view: CalendarView): string {
  if (view === 'month') return cursor.format(CALENDAR_DATE_FORMATS.monthTitle)
  if (view === 'day') return cursor.format(CALENDAR_DATE_FORMATS.dayTitle)

  const days = weekDays(cursor)
  const start = days[0]
  const end = days[days.length - 1]
  // "Jun 26 – 30, 2026" when the week sits inside one month, otherwise both months.
  return start.isSame(end, 'month')
    ? `${start.format(CALENDAR_DATE_FORMATS.rangeSameMonth)} – ${end.format(CALENDAR_DATE_FORMATS.rangeDay)}`
    : `${start.format(CALENDAR_DATE_FORMATS.rangeSameMonth)} – ${end.format(CALENDAR_DATE_FORMATS.fullDate)}`
}

/**
 * Owns which slice of the schedule is on screen — the view, the cursor date it is
 * centred on, the category filter, and the event opened in the detail modal.
 */
export function useEventCalendar() {
  const events = useCalendarStore((s) => s.events)
  const loading = useCalendarStore((s) => s.loading)
  const initialized = useCalendarStore((s) => s.initialized)
  const error = useCalendarStore((s) => s.error)
  const fetchEvents = useCalendarStore((s) => s.fetchEvents)

  const [view, setView] = useState<CalendarView>('week')
  const [cursor, setCursor] = useState<Dayjs>(() => dayjs())
  const [category, setCategory] = useState<CalendarCategoryFilter>(
    CALENDAR_CATEGORY_FILTER_ALL,
  )
  const [selected, setSelected] = useState<CalendarEvent | null>(null)

  useEffect(() => {
    void fetchEvents()
  }, [fetchEvents])

  const goPrevious = useCallback(
    () => setCursor((current) => current.subtract(1, STEP_UNIT[view])),
    [view],
  )
  const goNext = useCallback(
    () => setCursor((current) => current.add(1, STEP_UNIT[view])),
    [view],
  )
  const goToday = useCallback(() => setCursor(dayjs()), [])

  /** Clicking a month cell drills into that day rather than only moving the cursor. */
  const openDay = useCallback((day: Dayjs) => {
    setCursor(day)
    setView('day')
  }, [])

  const visibleEvents = useMemo(
    () =>
      category === CALENDAR_CATEGORY_FILTER_ALL
        ? events
        : events.filter((event) => event.category === category),
    [events, category],
  )

  return {
    view,
    setView,
    cursor,
    title: rangeLabel(cursor, view),
    category,
    setCategory,
    events: visibleEvents,
    total: events.length,
    loading,
    initialized,
    error,
    selected,
    setSelected,
    goPrevious,
    goNext,
    goToday,
    openDay,
  }
}
