import dayjs, { type Dayjs } from 'dayjs'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CALENDAR_CATEGORY_FILTER_ALL,
  CALENDAR_DATE_FORMATS,
} from '../constants/calendar'
import { isEventInDepartment } from '../constants/event'
import { usePortalRole } from '../store/auth-store'
import { useCalendarStore } from '../store/calendar-store'
import { useProfileStore } from '../store/profile-store'
import type { CalendarEvent, CalendarView } from '../types/calendar'
import type { EventCategory } from '../types/event'
import { weekDays } from '../utils/calendar-layout'

export type CalendarCategoryFilter = EventCategory | typeof CALENDAR_CATEGORY_FILTER_ALL

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
  return start.isSame(end, 'month')
    ? `${start.format(CALENDAR_DATE_FORMATS.rangeSameMonth)} – ${end.format(CALENDAR_DATE_FORMATS.rangeDay)}`
    : `${start.format(CALENDAR_DATE_FORMATS.rangeSameMonth)} – ${end.format(CALENDAR_DATE_FORMATS.fullDate)}`
}

export function useEventCalendar() {
  const allEvents = useCalendarStore((s) => s.events)
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

  // Coordinator: own college only; show nothing until the profile loads.
  const isCoordinator = usePortalRole() === 'coordinator'
  const profileDepartment = useProfileStore((s) => s.profile?.department)
  const ensureProfile = useProfileStore((s) => s.ensureProfile)

  useEffect(() => {
    void fetchEvents()
    if (isCoordinator) void ensureProfile()
  }, [ensureProfile, fetchEvents, isCoordinator])

  const events = useMemo(
    () =>
      isCoordinator
        ? allEvents.filter((event) =>
            isEventInDepartment(event.department, profileDepartment ?? ''),
          )
        : allEvents,
    [allEvents, isCoordinator, profileDepartment],
  )

  const goPrevious = useCallback(
    () => setCursor((current) => current.subtract(1, STEP_UNIT[view])),
    [view],
  )
  const goNext = useCallback(
    () => setCursor((current) => current.add(1, STEP_UNIT[view])),
    [view],
  )
  const goToday = useCallback(() => setCursor(dayjs()), [])

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
