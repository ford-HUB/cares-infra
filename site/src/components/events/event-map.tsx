import { Crosshair, MapPinOff, RefreshCw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  EVENT_MAP_HEIGHT_CLASS,
  EVENT_MAP_LEGEND,
  EVENT_MAP_STATUS_FILTERS,
  type EventMapStatusFilter,
} from '../../constants/event-map'
import { useEventStore } from '../../store/event-store'
import type { EventMapPin, EventTableRow } from '../../types/event'
import { geometryCenter } from '../../utils/geometry-center'
import { ContentShell } from '../portal/ui/content-shell'
import { EventLocationsMap } from './map/event-locations-map'
import { EventDetailModal, formatEventRow } from './modals/event-detail-modal'
import { FilterDropdown } from './ui/event-filter-dropdown'
import { EventMapCard } from './ui/event-map-card'
import { EventMapSkeleton } from './ui/event-map-skeleton'

export function EventMap() {
  const events = useEventStore((s) => s.events)
  const loading = useEventStore((s) => s.loading)
  const initialized = useEventStore((s) => s.initialized)
  const error = useEventStore((s) => s.error)
  const fetchEvents = useEventStore((s) => s.fetchEvents)

  const [statusFilter, setStatusFilter] = useState<EventMapStatusFilter>('all')
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null)
  const [detailRow, setDetailRow] = useState<EventTableRow | null>(null)
  const [resetToken, setResetToken] = useState(0)

  useEffect(() => {
    void fetchEvents()
  }, [fetchEvents])

  const rows = useMemo(() => events.map(formatEventRow), [events])

  const visibleRows = useMemo(
    () => (statusFilter === 'all' ? rows : rows.filter((row) => row.status === statusFilter)),
    [rows, statusFilter],
  )

  // Only events with a drawn area can be placed; the rest are counted separately
  // so the operator knows why the pin count is short of the event count.
  const pins = useMemo<EventMapPin[]>(
    () =>
      visibleRows.flatMap((row) => {
        const center = geometryCenter(row.rawEvent.geojson)
        if (!center) return []
        return [
          {
            eventId: row.event_id,
            title: row.title,
            status: row.status,
            participants: row.currentParticipants,
            imageUrl: row.event_image,
            center,
          },
        ]
      }),
    [visibleRows],
  )

  const unmappedCount = visibleRows.length - pins.length

  const selectedRow = useMemo(
    () => visibleRows.find((row) => row.event_id === selectedEventId) ?? null,
    [visibleRows, selectedEventId],
  )

  // A filter change can hide the open card's event, so the selection goes with it.
  const changeStatusFilter = (value: EventMapStatusFilter) => {
    setStatusFilter(value)
    setSelectedEventId(null)
  }

  const resetView = () => {
    setSelectedEventId(null)
    setResetToken((token) => token + 1)
  }

  const showSkeleton = !initialized || (loading && events.length === 0)

  return (
    <ContentShell variant="full">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Event Map</h1>
          <p className="text-sm text-gray-500">
            Every created event pinned across Cebu. Click a pin to see the event and how many
            volunteers have joined.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void fetchEvents()}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : undefined} />
          Refresh
        </button>
      </div>

      {showSkeleton ? (
        <EventMapSkeleton />
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <FilterDropdown
              value={statusFilter}
              onChange={changeStatusFilter}
              options={[...EVENT_MAP_STATUS_FILTERS]}
            />
            <button
              type="button"
              onClick={resetView}
              className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Crosshair size={14} />
              Whole of Cebu
            </button>
            <span className="text-sm text-gray-500">
              {pins.length} pinned
              {unmappedCount > 0 && ` · ${unmappedCount} without a drawn area`}
            </span>
            <div className="ml-auto flex flex-wrap items-center gap-3">
              {EVENT_MAP_LEGEND.map((entry) => (
                <span key={entry.status} className="flex items-center gap-1.5 text-xs text-gray-600">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  {entry.status}
                </span>
              ))}
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div
            className={`relative w-full overflow-hidden rounded-xl border border-gray-300 ${EVENT_MAP_HEIGHT_CLASS}`}
          >
            <EventLocationsMap
              pins={pins}
              selectedEventId={selectedEventId}
              resetToken={resetToken}
              onSelect={setSelectedEventId}
            />

            {pins.length === 0 && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="pointer-events-auto flex items-center gap-2 rounded-lg bg-white/95 px-4 py-3 text-sm text-gray-600 shadow-md">
                  <MapPinOff size={16} className="text-gray-400" />
                  No event has a drawn area to pin yet.
                </div>
              </div>
            )}

            {selectedRow && (
              <div className="pointer-events-none absolute bottom-4 left-4 z-10">
                <EventMapCard
                  event={selectedRow}
                  onClose={() => setSelectedEventId(null)}
                  onViewDetails={() => setDetailRow(selectedRow)}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {detailRow && <EventDetailModal event={detailRow} onClose={() => setDetailRow(null)} />}
    </ContentShell>
  )
}
