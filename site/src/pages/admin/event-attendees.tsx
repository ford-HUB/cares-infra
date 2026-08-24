import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { AttendeesTable } from '../../components/attendees/attendees-table'
import { AttendeesToolbar } from '../../components/attendees/attendees-toolbar'
import { AttendeeDetailModal } from '../../components/attendees/ui/attendee-detail-modal'
import { ContentShell } from '../../components/portal/ui/content-shell'
import {
  ATTENDEE_EVENT_FILTER_ALL,
  ATTENDEE_STATUS_FILTER_ALL,
  type AttendeeStatusFilter,
} from '../../constants/attendees'
import { useAttendeeStore } from '../../store/attendee-store'
import type { AttendeeEventOption, EventAttendee } from '../../types/attendee'
import { exportAttendeesCsv } from '../../utils/export-attendees-csv'

export function EventAttendeesPage() {
  const attendees = useAttendeeStore((s) => s.attendees)
  const loading = useAttendeeStore((s) => s.loading)
  const initialized = useAttendeeStore((s) => s.initialized)
  const error = useAttendeeStore((s) => s.error)
  const fetchAttendees = useAttendeeStore((s) => s.fetchAttendees)

  const [search, setSearch] = useState('')
  const [eventFilter, setEventFilter] = useState<string>(ATTENDEE_EVENT_FILTER_ALL)
  const [statusFilter, setStatusFilter] = useState<AttendeeStatusFilter>(
    ATTENDEE_STATUS_FILTER_ALL,
  )
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<EventAttendee | null>(null)

  useEffect(() => {
    void fetchAttendees()
  }, [fetchAttendees])

  // The picker is derived from the roster itself, so an event can never be selected
  // that has nobody on it — soonest event first, past events after.
  const events = useMemo<AttendeeEventOption[]>(() => {
    const byId = new Map<number, AttendeeEventOption>()
    attendees.forEach((attendee) => {
      if (!byId.has(attendee.eventId)) {
        byId.set(attendee.eventId, {
          eventId: attendee.eventId,
          title: attendee.eventTitle,
          eventDate: attendee.eventDate,
        })
      }
    })
    return [...byId.values()].sort(
      (a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime(),
    )
  }, [attendees])

  const inSelectedEvent = useMemo(
    () =>
      eventFilter === ATTENDEE_EVENT_FILTER_ALL
        ? attendees
        : attendees.filter((attendee) => String(attendee.eventId) === eventFilter),
    [attendees, eventFilter],
  )

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()

    return inSelectedEvent.filter((attendee) => {
      const matchesSearch =
        term.length === 0 ||
        `${attendee.firstName} ${attendee.lastName}`.toLowerCase().includes(term) ||
        attendee.email.toLowerCase().includes(term) ||
        (attendee.department?.toLowerCase().includes(term) ?? false)

      const matchesStatus =
        statusFilter === ATTENDEE_STATUS_FILTER_ALL || attendee.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [inSelectedEvent, search, statusFilter])

  const resetToFirstPage =
    <T,>(apply: (value: T) => void) =>
    (value: T) => {
      apply(value)
      setPage(1)
    }

  const handleExport = () => {
    if (filtered.length === 0) {
      toast.error('There is nothing to export for the current filters')
      return
    }

    const selectedEvent = events.find((option) => String(option.eventId) === eventFilter)
    const slug = selectedEvent
      ? selectedEvent.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      : 'all-events'

    exportAttendeesCsv(filtered, `attendees-${slug}.csv`)
    toast.success(`Exported ${filtered.length} attendees`)
  }

  return (
    <ContentShell variant="full" className="flex h-full flex-col">
      <AttendeesToolbar
        search={search}
        event={eventFilter}
        status={statusFilter}
        events={events}
        shown={filtered.length}
        total={attendees.length}
        initialized={initialized}
        onSearchChange={resetToFirstPage(setSearch)}
        onEventChange={resetToFirstPage(setEventFilter)}
        onStatusChange={resetToFirstPage(setStatusFilter)}
        onExport={handleExport}
      />

      {error && (
        <p className="mb-3 shrink-0 rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-700">
          {error}
        </p>
      )}

      <AttendeesTable
        attendees={filtered}
        loading={loading}
        initialized={initialized}
        page={page}
        onPageChange={setPage}
        onView={setSelected}
      />

      <AttendeeDetailModal attendee={selected} onClose={() => setSelected(null)} />
    </ContentShell>
  )
}
