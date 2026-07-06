import dayjs from 'dayjs'
import { X } from 'lucide-react'
import type { EventTableRow } from '../../../types/event'
import { EventStatusBadge } from '../ui/event-status-badge'

interface EventDetailModalProps {
  event: EventTableRow
  onClose: () => void
}

export function EventDetailModal({ event, onClose }: EventDetailModalProps) {
  const images =
    event.rawEvent.event_images ??
    (event.event_image ? [event.event_image] : [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="scrollbar-hide max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{event.title}</h2>
            <p className="text-sm text-gray-500">{event.type}</p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>

        {images.length > 0 && (
          <div className={`mb-4 grid gap-2 ${images.length > 1 ? 'grid-cols-3' : 'grid-cols-1'}`}>
            {images.map((src, i) => (
              <img
                key={src + i}
                src={src}
                alt={`${event.title} ${i + 1}`}
                className="h-28 w-full rounded-lg object-cover"
              />
            ))}
          </div>
        )}

        <dl className="space-y-3 text-sm">
          <Row label="Status" value={<EventStatusBadge status={event.status} />} />
          <Row label="Date" value={event.dateFull} />
          <Row label="Time" value={event.timeRange} />
          <Row label="Venue" value={event.location} />
          <Row label="Organizer" value={event.organizer} />
          <Row
            label="Participants"
            value={`${event.currentParticipants} / ${event.maxParticipants}`}
          />
          {event.department && <Row label="Department" value={event.department} />}
          {event.beneficiary_applicable && (
            <Row
              label="Beneficiaries"
              value={
                event.max_beneficiaries
                  ? `Up to ${event.max_beneficiaries}`
                  : 'Applicable (no cap set)'
              }
            />
          )}
          <Row label="Description" value={event.description} />
          {event.rawEvent.area_sqm != null && event.rawEvent.area_sqm > 0 && (
            <Row
              label="Drawn area"
              value={
                event.rawEvent.area_sqm >= 10_000
                  ? `${(event.rawEvent.area_sqm / 10_000).toFixed(2)} hectares`
                  : `${event.rawEvent.area_sqm.toFixed(0)} sq m`
              }
            />
          )}
          <Row
            label="Donations"
            value={
              [
                event.funds ? 'Funds' : null,
                event.goods
                  ? `Goods${event.rawEvent.goods_types?.length ? ` (${event.rawEvent.goods_types.join(', ')})` : ''}`
                  : null,
              ]
                .filter(Boolean)
                .join(' · ') || 'None'
            }
          />
        </dl>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-4 border-b border-gray-100 pb-2">
      <dt className="w-28 shrink-0 font-medium text-gray-500">{label}</dt>
      <dd className="text-gray-900">{value}</dd>
    </div>
  )
}

export function formatEventRow(event: import('../../../types/event').CaresEvent): EventTableRow {
  const type =
    event.category === 'Others' && event.specified_category
      ? event.specified_category
      : event.category

  return {
    id: event.event_id,
    event_id: event.event_id,
    title: event.title,
    type,
    date: dayjs(event.event_started).format('DD/MM/YYYY'),
    dateFull: dayjs(event.event_started).format('MMMM D, YYYY'),
    startTime: dayjs(event.event_started).format('h:mm A'),
    endTime: dayjs(event.event_ended).format('h:mm A'),
    timeRange: `${dayjs(event.event_started).format('h:mm A')} - ${dayjs(event.event_ended).format('h:mm A')}`,
    location: event.location,
    maxParticipants: event.max_participants,
    currentParticipants: event.participants,
    description: event.description,
    event_image: event.event_image,
    organizer: event.organizer_name,
    department: event.department,
    funds: event.funds_donation,
    goods: event.goods_donation,
    status: event.status,
    beneficiary_applicable: event.beneficiary_applicable,
    max_beneficiaries: event.max_beneficiaries,
    rawEvent: event,
  }
}
