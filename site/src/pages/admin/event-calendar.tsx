import { EventCalendar } from '../../components/calendar/event-calendar'
import { ContentShell } from '../../components/portal/ui/content-shell'
import { useEventCalendar } from '../../hooks/use-event-calendar'

export function EventCalendarPage() {
  const {
    view,
    setView,
    cursor,
    title,
    category,
    setCategory,
    events,
    total,
    initialized,
    error,
    selected,
    setSelected,
    goPrevious,
    goNext,
    goToday,
    openDay,
  } = useEventCalendar()

  return (
    <ContentShell variant="full" className="flex h-full flex-col">
      <EventCalendar
        view={view}
        cursor={cursor}
        title={title}
        category={category}
        events={events}
        total={total}
        initialized={initialized}
        error={error}
        selected={selected}
        onViewChange={setView}
        onCategoryChange={setCategory}
        onPrevious={goPrevious}
        onNext={goNext}
        onToday={goToday}
        onOpenDay={openDay}
        onSelect={setSelected}
      />
    </ContentShell>
  )
}
