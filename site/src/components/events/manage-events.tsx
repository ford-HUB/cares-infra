import dayjs from 'dayjs'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  matchesEventStatusFilter,
  matchesEventTimeFilter,
  type EventStatusFilter,
  type EventTimeFilter,
} from '../../constants/event-filters'
import type { EventSortKey } from '../../constants/manage-events'
import { ContentShell } from '../portal/ui/content-shell'
import { useEventStore } from '../../store/event-store'
import type { EventTableRow } from '../../types/event'
import { CancelEventModal } from './modals/cancel-event-modal'
import { DeleteEventModal } from './modals/delete-event-modal'
import { EventDetailModal, formatEventRow } from './modals/event-detail-modal'
import { EventFormModal } from './modals/event-form-modal'
import { EventActionsMenu } from './ui/event-actions-menu'
import { ManageEventsTable } from './ui/manage-events-table'
import { ManageEventsToolbar } from './ui/manage-events-toolbar'

interface ActionMenuState {
  eventId: number
  anchor: DOMRect
}

export function ManageEvents() {
  const { events, loading, initialized, error, fetchEvents, removeEvent, cancelEvent } =
    useEventStore()

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState('')
  const [timeFilter, setTimeFilter] = useState<EventTimeFilter>('all')
  const [statusFilter, setStatusFilter] = useState<EventStatusFilter>('all')
  const [sortConfig, setSortConfig] = useState<{
    key: EventSortKey | null
    direction: 'asc' | 'desc'
  }>({ key: null, direction: 'asc' })
  const [page, setPage] = useState(1)

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editRow, setEditRow] = useState<EventTableRow | null>(null)
  const [detailRow, setDetailRow] = useState<EventTableRow | null>(null)
  const [deleteState, setDeleteState] = useState<{
    isOpen: boolean
    eventName: string
    eventId: number | null
  }>({ isOpen: false, eventName: '', eventId: null })
  const [cancelState, setCancelState] = useState<{
    isOpen: boolean
    eventName: string
    eventCode: number | null
  }>({ isOpen: false, eventName: '', eventCode: null })
  const [actionMenu, setActionMenu] = useState<ActionMenuState | null>(null)

  useEffect(() => {
    void fetchEvents()
  }, [fetchEvents])

  const rows = useMemo(() => events.map(formatEventRow), [events])

  const eventTypes = useMemo(() => [...new Set(rows.map((e) => e.type))].sort(), [rows])

  const upcomingCount = useMemo(
    () => rows.filter((row) => row.status === 'Upcoming').length,
    [rows],
  )

  const hasActiveFilters =
    Boolean(searchTerm) ||
    Boolean(selectedType) ||
    timeFilter !== 'all' ||
    statusFilter !== 'all'

  const clearFilters = () => {
    setSearchTerm('')
    setSelectedType('')
    setTimeFilter('all')
    setStatusFilter('all')
  }

  const filteredEvents = useMemo(() => {
    let filtered = rows.filter((event) => {
      const term = searchTerm.toLowerCase()
      const matchesSearch =
        !term ||
        event.title.toLowerCase().includes(term) ||
        event.location.toLowerCase().includes(term) ||
        event.organizer.toLowerCase().includes(term) ||
        String(event.event_id).includes(term)
      const matchesType = !selectedType || event.type === selectedType
      const matchesTime = matchesEventTimeFilter(event.rawEvent, timeFilter)
      const matchesStatus = matchesEventStatusFilter(event.status, statusFilter)
      return matchesSearch && matchesType && matchesTime && matchesStatus
    })

    if (sortConfig.key) {
      filtered = [...filtered].sort((a, b) => {
        let aVal: string | number | Date = a[sortConfig.key!] as string | number
        let bVal: string | number | Date = b[sortConfig.key!] as string | number
        if (sortConfig.key === 'date') {
          aVal = dayjs(a.date, 'DD/MM/YYYY').toDate()
          bVal = dayjs(b.date, 'DD/MM/YYYY').toDate()
        }
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }

    return filtered
  }, [rows, searchTerm, selectedType, timeFilter, statusFilter, sortConfig])

  /** Any filter change re-pages from the top, so the visible slice stays meaningful. */
  const resetToFirstPage =
    <T,>(setter: (value: T) => void) =>
    (value: T) => {
      setter(value)
      setPage(1)
    }

  const handleSort = (key: EventSortKey) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }))
    setPage(1)
  }

  const openActionMenu = (event: EventTableRow, button: HTMLButtonElement) => {
    // Toggle off when the same row's trigger is clicked again.
    setActionMenu((current) =>
      current?.eventId === event.id
        ? null
        : { eventId: event.id, anchor: button.getBoundingClientRect() },
    )
  }

  const closeActionMenu = useCallback(() => setActionMenu(null), [])

  const activeMenuEvent = actionMenu
    ? filteredEvents.find((e) => e.id === actionMenu.eventId)
    : null

  const handleCancel = async () => {
    if (!cancelState.eventCode) return
    await cancelEvent(cancelState.eventCode)
    setCancelState({ isOpen: false, eventName: '', eventCode: null })
  }

  const handleDelete = async () => {
    if (!deleteState.eventId) return
    const ok = await removeEvent(deleteState.eventId)
    if (ok) setDeleteState({ isOpen: false, eventName: '', eventId: null })
  }

  return (
    <ContentShell variant="full" className="flex h-full flex-col">
      <ManageEventsToolbar
        search={searchTerm}
        time={timeFilter}
        status={statusFilter}
        type={selectedType}
        types={eventTypes}
        shown={filteredEvents.length}
        total={rows.length}
        upcoming={upcomingCount}
        hasActiveFilters={hasActiveFilters}
        initialized={initialized}
        onSearchChange={resetToFirstPage(setSearchTerm)}
        onTimeChange={resetToFirstPage(setTimeFilter)}
        onStatusChange={resetToFirstPage(setStatusFilter)}
        onTypeChange={resetToFirstPage(setSelectedType)}
        onClearFilters={() => {
          clearFilters()
          setPage(1)
        }}
        onCreate={() => setShowCreateModal(true)}
      />

      {error && (
        <p className="mb-2 shrink-0 rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-700">
          {error}
        </p>
      )}

      <ManageEventsTable
        events={filteredEvents}
        loading={loading}
        initialized={initialized}
        page={page}
        sortConfig={sortConfig}
        hasActiveFilters={hasActiveFilters}
        onPageChange={setPage}
        onSort={handleSort}
        onView={setDetailRow}
        onOpenActions={openActionMenu}
        activeActionsEventId={actionMenu?.eventId ?? null}
        onClearFilters={() => {
          clearFilters()
          setPage(1)
        }}
        onCreate={() => setShowCreateModal(true)}
      />

      {actionMenu && activeMenuEvent && (
        <EventActionsMenu
          event={activeMenuEvent}
          anchor={actionMenu.anchor}
          onClose={closeActionMenu}
          onView={setDetailRow}
          onEdit={setEditRow}
          onCancel={(event) =>
            setCancelState({ isOpen: true, eventName: event.title, eventCode: event.event_id })
          }
          onDelete={(event) =>
            setDeleteState({ isOpen: true, eventName: event.title, eventId: event.id })
          }
        />
      )}

      {showCreateModal && (
        <EventFormModal
          mode="create"
          onClose={() => setShowCreateModal(false)}
          onSaved={() => void fetchEvents()}
        />
      )}

      {editRow && (
        <EventFormModal
          mode="edit"
          eventId={editRow.event_id}
          defaultValues={{
            title: editRow.rawEvent.title,
            description: editRow.rawEvent.description,
            event_started: editRow.rawEvent.event_started,
            event_ended: editRow.rawEvent.event_ended,
            location: editRow.rawEvent.location,
            max_participants: editRow.rawEvent.max_participants,
            organizer_name: editRow.rawEvent.organizer_name,
            category: editRow.rawEvent.category,
            department: editRow.rawEvent.department,
            specified_category: editRow.rawEvent.specified_category,
            event_images:
              editRow.rawEvent.event_images ??
              (editRow.rawEvent.event_image ? [editRow.rawEvent.event_image] : []),
            beneficiary_applicable: editRow.rawEvent.beneficiary_applicable,
            max_beneficiaries: editRow.rawEvent.max_beneficiaries,
            funds_donation: editRow.rawEvent.funds_donation,
            goods_donation: editRow.rawEvent.goods_donation,
            goods_types: editRow.rawEvent.goods_types ?? [],
            geojson: editRow.rawEvent.geojson,
            area_sqm: editRow.rawEvent.area_sqm,
            marker_lat: editRow.rawEvent.marker_lat,
            marker_lng: editRow.rawEvent.marker_lng,
          }}
          onClose={() => setEditRow(null)}
          onSaved={() => void fetchEvents()}
        />
      )}

      {detailRow && (
        <EventDetailModal event={detailRow} onClose={() => setDetailRow(null)} />
      )}

      <CancelEventModal
        isOpen={cancelState.isOpen}
        eventName={cancelState.eventName}
        onClose={() => setCancelState({ isOpen: false, eventName: '', eventCode: null })}
        onConfirm={() => void handleCancel()}
      />

      <DeleteEventModal
        isOpen={deleteState.isOpen}
        eventName={deleteState.eventName}
        onClose={() => setDeleteState({ isOpen: false, eventName: '', eventId: null })}
        onConfirm={() => void handleDelete()}
      />
    </ContentShell>
  )
}

