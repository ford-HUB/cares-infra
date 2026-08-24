import { CalendarDays, ImageOff, MapPin, Users, X } from 'lucide-react'
import type { EventTableRow } from '../../../types/event'
import { EventStatusBadge } from './event-status-badge'

interface EventMapCardProps {
  event: EventTableRow
  onClose: () => void
  onViewDetails: () => void
}

/** Percentage of the participant cap that is filled, clamped for the bar width. */
function fillPercent(current: number, max: number): number {
  if (!max) return 0
  return Math.min(100, Math.round((current / max) * 100))
}

/**
 * Floating card shown over the map when a pin is clicked: the event photo,
 * where and when it runs, and how many volunteers have joined.
 */
export function EventMapCard({ event, onClose, onViewDetails }: EventMapCardProps) {
  const filled = fillPercent(event.currentParticipants, event.maxParticipants)

  return (
    <div className="pointer-events-auto w-72 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
      <div className="relative h-32 w-full bg-gray-100">
        {event.event_image ? (
          <img src={event.event_image} alt={event.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-400">
            <ImageOff size={24} />
          </div>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close event details"
          className="absolute top-2 right-2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
        >
          <X size={14} />
        </button>
      </div>

      <div className="space-y-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-gray-900">{event.title}</h3>
          <EventStatusBadge status={event.status} />
        </div>
        <p className="text-xs text-gray-500">{event.type}</p>

        <p className="flex items-start gap-1.5 text-xs text-gray-600">
          <MapPin size={13} className="mt-0.5 shrink-0 text-gray-400" />
          <span>{event.location}</span>
        </p>
        <p className="flex items-start gap-1.5 text-xs text-gray-600">
          <CalendarDays size={13} className="mt-0.5 shrink-0 text-gray-400" />
          <span>
            {event.dateFull} · {event.timeRange}
          </span>
        </p>

        <div className="rounded-lg bg-gray-50 p-2">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 font-medium text-gray-700">
              <Users size={13} className="text-gray-400" />
              Participants
            </span>
            <span className="font-semibold text-gray-900">
              {event.currentParticipants} / {event.maxParticipants}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
            <div className="h-full rounded-full bg-[var(--cares-primary)]" style={{ width: `${filled}%` }} />
          </div>
        </div>

        <button
          type="button"
          onClick={onViewDetails}
          className="w-full rounded-lg border border-gray-300 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          View full details
        </button>
      </div>
    </div>
  )
}
