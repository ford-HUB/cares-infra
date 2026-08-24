import dayjs from 'dayjs'
import {
  ArrowUpDown,
  Ban,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Eye,
  MoreVertical,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  EVENT_STATUS_FILTERS,
  EVENT_TIME_FILTERS,
  matchesEventStatusFilter,
  matchesEventTimeFilter,
  type EventStatusFilter,
  type EventTimeFilter,
} from '../../constants/event-filters'
import { ContentShell } from '../portal/ui/content-shell'
import { useEventStore } from '../../store/event-store'
import type { EventTableRow } from '../../types/event'
import { DeleteEventModal } from './modals/delete-event-modal'
import { EventDetailModal, formatEventRow } from './modals/event-detail-modal'
import { EventFormModal } from './modals/event-form-modal'
import { FilterDropdown } from './ui/event-filter-dropdown'
import { EventStatusBadge } from './ui/event-status-badge'

type SortKey = 'event_id' | 'title' | 'location' | 'type' | 'status' | 'date'

interface ActionMenuState {
  eventId: number
  top: number
  right: number
}

export function ManageEvents() {
  const { events, loading, error, fetchEvents, removeEvent, cancelEvent } = useEventStore()

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState('')
  const [timeFilter, setTimeFilter] = useState<EventTimeFilter>('all')
  const [statusFilter, setStatusFilter] = useState<EventStatusFilter>('all')
  const [sortConfig, setSortConfig] = useState<{
    key: SortKey | null
    direction: 'asc' | 'desc'
  }>({ key: null, direction: 'asc' })
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(5)

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editRow, setEditRow] = useState<EventTableRow | null>(null)
  const [detailRow, setDetailRow] = useState<EventTableRow | null>(null)
  const [deleteState, setDeleteState] = useState<{
    isOpen: boolean
    eventName: string
    eventId: number | null
  }>({ isOpen: false, eventName: '', eventId: null })
  const [actionMenu, setActionMenu] = useState<ActionMenuState | null>(null)

  useEffect(() => {
    void fetchEvents()
  }, [fetchEvents])

  const rows = useMemo(() => events.map(formatEventRow), [events])

  const eventTypes = useMemo(() => [...new Set(rows.map((e) => e.type))].sort(), [rows])

  const typeFilterOptions = useMemo(
    () => [
      { value: '', label: 'All Types' },
      ...eventTypes.map((t) => ({ value: t, label: t })),
    ],
    [eventTypes],
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

  const totalPages = Math.ceil(filteredEvents.length / itemsPerPage) || 1
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedEvents = filteredEvents.slice(startIndex, startIndex + itemsPerPage)

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedType, timeFilter, statusFilter, itemsPerPage])

  const pageNumbers = useMemo(() => {
    const pages: (number | 'ellipsis')[] = []
    const maxButtons = 5
    if (totalPages <= maxButtons + 2) {
      for (let i = 1; i <= totalPages; i += 1) pages.push(i)
      return pages
    }
    pages.push(1)
    const start = Math.max(2, currentPage - 1)
    const end = Math.min(totalPages - 1, currentPage + 1)
    if (start > 2) pages.push('ellipsis')
    for (let i = start; i <= end; i += 1) pages.push(i)
    if (end < totalPages - 1) pages.push('ellipsis')
    pages.push(totalPages)
    return pages
  }, [currentPage, totalPages])

  const handleSort = (key: SortKey) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  const openActionMenu = (eventId: number, button: HTMLButtonElement) => {
    const rect = button.getBoundingClientRect()
    setActionMenu({
      eventId,
      top: rect.top + window.scrollY - 8,
      right: window.innerWidth - rect.right + window.scrollX,
    })
  }

  const activeMenuEvent = actionMenu
    ? filteredEvents.find((e) => e.id === actionMenu.eventId)
    : null

  const handleDelete = async () => {
    if (!deleteState.eventId) return
    const ok = await removeEvent(deleteState.eventId)
    if (ok) setDeleteState({ isOpen: false, eventName: '', eventId: null })
  }

  if (loading && rows.length === 0) {
    return (
      <ContentShell variant="full">
        <div className="flex h-64 items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-t-2 border-b-2 border-[var(--cares-primary)]" />
        </div>
      </ContentShell>
    )
  }

  if (error && rows.length === 0) {
    return (
      <ContentShell variant="full">
        <div className="rounded-lg border border-red-400 bg-red-100 px-4 py-3 text-red-700">
          Error loading events: {error}
        </div>
      </ContentShell>
    )
  }

  return (
    <ContentShell variant="full">
      <div className="mb-4 text-sm text-gray-600">
        <span>Home</span>
        <span className="mx-2">-</span>
        <span className="font-medium text-gray-900">All Events</span>
      </div>

      <div className="mb-6">
        <div className="mb-2 flex items-center gap-3">
          <div className="h-8 w-1 rounded bg-[var(--cares-primary)]" />
          <h1 className="text-2xl font-bold text-gray-900">All Events</h1>
        </div>

        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-3">
            <div className="relative max-w-md flex-1">
              <Search
                className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="search"
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white py-2 pr-4 pl-10 focus:border-transparent focus:ring-2 focus:ring-[var(--cares-primary)] focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <FilterDropdown
                value={timeFilter}
                options={EVENT_TIME_FILTERS}
                onChange={setTimeFilter}
              />
              <FilterDropdown
                value={statusFilter}
                options={EVENT_STATUS_FILTERS}
                onChange={setStatusFilter}
              />
              <FilterDropdown
                value={selectedType}
                options={typeFilterOptions}
                onChange={setSelectedType}
              />
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
                >
                  <X size={14} />
                  Clear filters
                </button>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="flex items-center justify-center gap-2 rounded-lg bg-[var(--cares-primary)] px-4 py-2 text-white transition-colors hover:bg-[var(--cares-primary-hover)]"
          >
            <Plus size={20} />
            Create Event
          </button>
        </div>
      </div>

      <div className="relative rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between text-sm text-gray-600">
          <span>
            <span className="font-semibold text-gray-900">{filteredEvents.length}</span> event
            {filteredEvents.length === 1 ? '' : 's'}
            {hasActiveFilters ? ' matching filters' : ' total'}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <SortableHeader label="ID No" sortKey="event_id" sortConfig={sortConfig} onSort={handleSort} />
                <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                  Organizer
                </th>
                <SortableHeader label="Event Name" sortKey="title" sortConfig={sortConfig} onSort={handleSort} />
                <SortableHeader label="Venue" sortKey="location" sortConfig={sortConfig} onSort={handleSort} />
                <SortableHeader label="Type" sortKey="type" sortConfig={sortConfig} onSort={handleSort} />
                <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                  current/max
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                  Time
                </th>
                <SortableHeader label="Status" sortKey="status" sortConfig={sortConfig} onSort={handleSort} />
                <SortableHeader label="Date" sortKey="date" sortConfig={sortConfig} onSort={handleSort} />
                <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center">
                    <p className="text-gray-500">
                      {hasActiveFilters ? 'No events match your filters' : 'No events found'}
                    </p>
                    {hasActiveFilters ? (
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="mt-4 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
                      >
                        Clear filters
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowCreateModal(true)}
                        className="mt-4 rounded-lg bg-[var(--cares-primary)] px-4 py-2 text-white hover:bg-[var(--cares-primary-hover)]"
                      >
                        Create Your First Event
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedEvents.map((event, index) => {
                  const hasDonation = event.funds || event.goods
                  const baseBg = index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                  return (
                    <tr
                      key={event.id}
                      className={`transition-colors hover:bg-gray-50 ${hasDonation ? 'bg-green-50' : baseBg}`}
                    >
                      <td className="px-4 py-4 text-sm whitespace-nowrap text-gray-900">
                        {event.event_id}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--cares-primary)] text-xs font-medium text-white">
                            {event.organizer.charAt(0)}
                          </div>
                          <span className="text-sm text-gray-900">{event.organizer}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm whitespace-nowrap text-gray-900">
                        <div className="flex items-center gap-3">
                          {event.event_image ? (
                            <img
                              src={event.event_image}
                              alt=""
                              className="h-9 w-9 shrink-0 rounded-md object-cover"
                            />
                          ) : (
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gray-100 text-xs text-gray-400">
                              —
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => setDetailRow(event)}
                            className="text-left font-medium hover:text-[var(--cares-primary)] hover:underline"
                          >
                            {event.title}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm whitespace-nowrap text-gray-600">
                        {event.location}
                      </td>
                      <td className="px-4 py-4 text-sm whitespace-nowrap text-gray-600">
                        {event.type}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">
                          <span className="font-medium text-[var(--cares-primary)]">
                            {event.currentParticipants}
                          </span>{' '}
                          / {event.maxParticipants}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm whitespace-nowrap text-gray-600">
                        {event.timeRange}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <EventStatusBadge status={event.status} />
                      </td>
                      <td className="px-4 py-4 text-sm whitespace-nowrap text-gray-600">
                        {event.date}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => openActionMenu(event.id, e.currentTarget)}
                          className="flex h-8 w-8 items-center justify-center rounded bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900"
                          title="Actions"
                        >
                          <MoreVertical size={16} />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {filteredEvents.length > 0 && (
          <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
            <div className="flex flex-col items-center justify-between gap-4 lg:flex-row">
              <div className="flex items-center gap-4">
                <p className="text-sm text-gray-700">
                  Showing <span className="font-semibold">{startIndex + 1}</span> to{' '}
                  <span className="font-semibold">
                    {Math.min(startIndex + itemsPerPage, filteredEvents.length)}
                  </span>{' '}
                  of <span className="font-semibold">{filteredEvents.length}</span> results
                </p>
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  Rows
                  <select
                    value={itemsPerPage}
                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                    className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm focus:ring-2 focus:ring-[var(--cares-primary)] focus:outline-none"
                  >
                    {[5, 10, 20, 50].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>

                {pageNumbers.map((page, i) =>
                  page === 'ellipsis' ? (
                    <span key={`e-${i}`} className="px-2 text-sm text-gray-400">
                      …
                    </span>
                  ) : (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setCurrentPage(page)}
                      className={`min-w-9 rounded-lg border px-3 py-2 text-sm ${
                        page === currentPage
                          ? 'border-[var(--cares-primary)] bg-[var(--cares-primary)] text-white'
                          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ),
                )}

                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {actionMenu && activeMenuEvent && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setActionMenu(null)} />
          <div
            className="fixed z-50 rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
            style={{
              top: actionMenu.top,
              right: actionMenu.right,
              transform: 'translateY(-100%)',
            }}
          >
            <ActionMenuItem
              icon={<Eye size={18} />}
              title="View details"
              onClick={() => {
                setDetailRow(activeMenuEvent)
                setActionMenu(null)
              }}
            />
            <ActionMenuItem
              icon={<Edit2 size={18} />}
              title="Edit"
              onClick={() => {
                setEditRow(activeMenuEvent)
                setActionMenu(null)
              }}
            />
            {activeMenuEvent.status !== 'Cancelled' && (
              <ActionMenuItem
                icon={<Ban size={18} className="text-amber-600" />}
                title="Cancel event"
                className="hover:bg-amber-50"
                onClick={() => {
                  void cancelEvent(activeMenuEvent.event_id)
                  setActionMenu(null)
                }}
              />
            )}
            <ActionMenuItem
              icon={<Trash2 size={18} className="text-red-600" />}
              title="Delete"
              className="hover:bg-red-50"
              onClick={() => {
                setDeleteState({
                  isOpen: true,
                  eventName: activeMenuEvent.title,
                  eventId: activeMenuEvent.id,
                })
                setActionMenu(null)
              }}
            />
          </div>
        </>
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

      <DeleteEventModal
        isOpen={deleteState.isOpen}
        eventName={deleteState.eventName}
        onClose={() => setDeleteState({ isOpen: false, eventName: '', eventId: null })}
        onConfirm={() => void handleDelete()}
      />
    </ContentShell>
  )
}

function SortableHeader({
  label,
  sortKey,
  sortConfig,
  onSort,
}: {
  label: string
  sortKey: SortKey
  sortConfig: { key: SortKey | null; direction: 'asc' | 'desc' }
  onSort: (key: SortKey) => void
}) {
  const active = sortConfig.key === sortKey
  return (
    <th
      className="cursor-pointer px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase hover:bg-gray-100"
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-2">
        <span>{label}</span>
        <ArrowUpDown
          className={`h-3 w-3 ${active ? 'text-[var(--cares-primary)]' : 'text-gray-400'}`}
        />
      </div>
    </th>
  )
}

function ActionMenuItem({
  icon,
  title,
  onClick,
  className = '',
}: {
  icon: React.ReactNode
  title: string
  onClick: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`flex w-full items-center justify-center px-3 py-2 hover:bg-gray-50 ${className}`}
    >
      {icon}
    </button>
  )
}
