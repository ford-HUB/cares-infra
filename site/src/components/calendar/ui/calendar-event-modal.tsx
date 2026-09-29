import dayjs from 'dayjs'
import { CalendarDays, Clock, MapPin, User, Users, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  CALENDAR_CATEGORY_TINTS,
  CALENDAR_DATE_FORMATS,
} from '../../../constants/calendar'
import { formatNumber } from '../../../constants/formatting'
import type { CalendarEvent } from '../../../types/calendar'
import { EventStatusBadge } from '../../events/ui/event-status-badge'

interface CalendarEventModalProps {
  event: CalendarEvent | null
  onClose: () => void
}

function Row({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] tracking-wider text-gray-400 uppercase">{label}</p>
        <p className="truncate text-[13px] text-gray-800" title={value}>
          {value}
        </p>
      </div>
    </div>
  )
}

/** Read-only event detail — scheduling itself stays in Manage Event. */
export function CalendarEventModal({ event, onClose }: CalendarEventModalProps) {
  if (!event) return null

  const start = dayjs(event.start)
  const end = dayjs(event.end)
  const tint = CALENDAR_CATEGORY_TINTS[event.category]
  const when = start.isSame(end, 'day')
    ? start.format(CALENDAR_DATE_FORMATS.dayTitle)
    : `${start.format(CALENDAR_DATE_FORMATS.fullDate)} – ${end.format(CALENDAR_DATE_FORMATS.fullDate)}`
  const time = event.allDay
    ? 'All day'
    : `${start.format(CALENDAR_DATE_FORMATS.time)} – ${end.format(CALENDAR_DATE_FORMATS.time)}`

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${event.title} detail`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="w-full max-w-lg rounded-xl bg-white shadow-lg">
        <div className="flex items-start justify-between gap-3 border-b border-gray-200 p-5">
          <div className="flex min-w-0 items-start gap-3">
            <span className={`mt-1 h-9 w-1.5 shrink-0 rounded-full ${tint.bar}`} aria-hidden />
            <div className="min-w-0">
              <h3 className="truncate text-lg font-semibold text-gray-900">
                {event.title}
              </h3>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${tint.chip}`}>
                  {event.category}
                </span>
                <EventStatusBadge status={event.status} />
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
          <Row icon={CalendarDays} label="Date" value={when} />
          <Row icon={Clock} label="Time" value={time} />
          <Row icon={MapPin} label="Location" value={event.location} />
          <Row icon={User} label="Organizer" value={event.organizer} />
          <Row
            icon={Users}
            label="Volunteers"
            value={
              event.maxParticipants > 0
                ? `${formatNumber(event.participants)} of ${formatNumber(event.maxParticipants)} slots filled`
                : 'Open to everyone'
            }
          />
          {event.department && (
            <Row icon={Users} label="Department" value={event.department} />
          )}
        </div>
      </div>
    </div>
  )
}
