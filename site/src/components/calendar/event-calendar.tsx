import type { Dayjs } from 'dayjs'
import { useMemo } from 'react'
import { CALENDAR_CATEGORY_FILTER_ALL } from '../../constants/calendar'
import { EVENT_CATEGORIES } from '../../constants/event'
import type { CalendarCategoryFilter } from '../../hooks/use-event-calendar'
import type { CalendarEvent, CalendarView } from '../../types/calendar'
import type { EventCategory } from '../../types/event'
import { eventsInDays, monthGridDays, weekDays } from '../../utils/calendar-layout'
import { CalendarEventModal } from './ui/calendar-event-modal'
import { CalendarLegend } from './ui/calendar-legend'
import { CalendarMonthGrid } from './ui/calendar-month-grid'
import { CalendarSkeleton } from './ui/calendar-skeleton'
import { CalendarTimeGrid } from './ui/calendar-time-grid'
import { CalendarToolbar } from './ui/calendar-toolbar'

interface EventCalendarProps {
  view: CalendarView
  cursor: Dayjs
  title: string
  category: CalendarCategoryFilter
  events: CalendarEvent[]
  total: number
  initialized: boolean
  error: string | null
  selected: CalendarEvent | null
  onViewChange: (view: CalendarView) => void
  onCategoryChange: (category: CalendarCategoryFilter) => void
  onPrevious: () => void
  onNext: () => void
  onToday: () => void
  onOpenDay: (day: Dayjs) => void
  onSelect: (event: CalendarEvent | null) => void
}

/**
 * The schedule for one range, in whichever of the three grids is selected.
 * Everything below is presentational — navigation state lives in the hook.
 */
export function EventCalendar({
  view,
  cursor,
  title,
  category,
  events,
  total,
  initialized,
  error,
  selected,
  onViewChange,
  onCategoryChange,
  onPrevious,
  onNext,
  onToday,
  onOpenDay,
  onSelect,
}: EventCalendarProps) {
  // The days on screen decide both the counts and the legend, so they are derived
  // once here rather than in each grid.
  const visibleDays = useMemo(() => {
    if (view === 'month') return monthGridDays(cursor)
    if (view === 'day') return [cursor]
    return weekDays(cursor)
  }, [view, cursor])

  const inRange = useMemo(
    () => eventsInDays(events, visibleDays),
    [events, visibleDays],
  )

  const legendCategories = useMemo<EventCategory[]>(() => {
    const present = new Set(inRange.map((event) => event.category))
    return EVENT_CATEGORIES.filter((option) => present.has(option))
  }, [inRange])

  return (
    <div className="flex h-full flex-col">
      <CalendarToolbar
        title={title}
        view={view}
        category={category}
        shown={inRange.length}
        total={total}
        initialized={initialized}
        onViewChange={onViewChange}
        onCategoryChange={onCategoryChange}
        onPrevious={onPrevious}
        onNext={onNext}
        onToday={onToday}
      />

      {error && (
        <p className="mb-3 shrink-0 rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-700">
          {error}
        </p>
      )}

      {!initialized ? (
        <CalendarSkeleton />
      ) : view === 'month' ? (
        <CalendarMonthGrid
          cursor={cursor}
          events={events}
          onSelect={onSelect}
          onOpenDay={onOpenDay}
        />
      ) : (
        <CalendarTimeGrid days={visibleDays} events={events} onSelect={onSelect} />
      )}

      {initialized && inRange.length === 0 && (
        <p className="mt-3 shrink-0 text-[13px] text-gray-500">
          No events scheduled in this range
          {category === CALENDAR_CATEGORY_FILTER_ALL ? '' : ` for ${category}`}.
        </p>
      )}

      <CalendarLegend categories={legendCategories} />

      <CalendarEventModal event={selected} onClose={() => onSelect(null)} />
    </div>
  )
}
