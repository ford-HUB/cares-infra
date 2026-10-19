import { useMemo } from 'react'
import { Loader2, UserCheck } from 'lucide-react'
import { scheduledEventHours } from '../../../constants/attendees'
import { formatDateShort, formatTimeRange } from '../../../constants/formatting'
import { useManualAttendanceForm } from '../../../hooks/use-manual-attendance-form'
import type { EventAttendee } from '../../../types/attendee'

interface ManualAttendanceModalProps {
  /** The selected rows; the modal is closed while this is empty. */
  attendees: EventAttendee[]
  onClose: () => void
  /** Called after the server accepted the ruling, so the page can clear its selection. */
  onMarked: () => void
}

interface EventGroup {
  eventId: number
  title: string
  start: string
  end: string
  hours: number
  count: number
}

/**
 * The confirmation for marking participants present by hand — the backup when the
 * geofence could not rule. It spells out, per event, the hours each person will be
 * credited (the event's full start-to-end window), since that is the part the
 * operator cannot see from the table.
 */
export function ManualAttendanceModal({
  attendees,
  onClose,
  onMarked,
}: ManualAttendanceModalProps) {
  const ids = useMemo(() => attendees.map((attendee) => attendee.id), [attendees])
  const { form, onSubmit, submitting } = useManualAttendanceForm(ids, onMarked)

  const groups = useMemo<EventGroup[]>(() => {
    const byEvent = new Map<number, EventGroup>()
    attendees.forEach((attendee) => {
      const group = byEvent.get(attendee.eventId)
      if (group) {
        group.count++
        return
      }
      byEvent.set(attendee.eventId, {
        eventId: attendee.eventId,
        title: attendee.eventTitle,
        start: attendee.eventDate,
        end: attendee.eventEndDate,
        hours: scheduledEventHours(attendee),
        count: 1,
      })
    })
    return [...byEvent.values()]
  }, [attendees])

  if (attendees.length === 0) return null

  const errors = form.formState.errors
  const total = attendees.length

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-xl bg-white shadow-lg">
        <div className="shrink-0 px-6 pt-6">
          <h3 className="text-lg font-semibold text-gray-900">Mark present manually</h3>
          <p className="mt-2 text-sm text-gray-600">
            Use this when geofence attendance failed for participants who were at the
            event. The{' '}
            <strong>
              {total} selected participant{total === 1 ? '' : 's'}
            </strong>{' '}
            will be marked <strong>Completed</strong> and credited the event's full
            scheduled hours.
          </p>
        </div>

        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
            <div className="divide-y divide-gray-100 rounded-lg border border-gray-200">
              {groups.map((group) => (
                <div
                  key={group.eventId}
                  className="flex items-start justify-between gap-3 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-gray-800">
                      {group.title}
                    </p>
                    <p className="text-[12px] text-gray-500">
                      {formatDateShort(group.start)} ·{' '}
                      {formatTimeRange(group.start, group.end)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[13px] font-semibold text-gray-900 tabular-nums">
                      {group.hours} h each
                    </p>
                    <p className="text-[12px] text-gray-500 tabular-nums">
                      {group.count} participant{group.count === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div>
              <label
                htmlFor="manual-attendance-reason"
                className="block text-sm font-medium text-gray-700"
              >
                Reason <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <textarea
                id="manual-attendance-reason"
                rows={3}
                {...form.register('reason')}
                placeholder="e.g. Location services failed on site; verified by sign-in sheet"
                className="mt-1 w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:border-transparent focus:ring-2 focus:ring-[var(--cares-primary)] focus:outline-none"
              />
              {errors.reason && (
                <p className="mt-1 text-[12px] text-red-600">{errors.reason.message}</p>
              )}
              <p className="mt-1 text-[12px] text-gray-500">
                Saved to each participant's remarks and the audit log.
              </p>
            </div>
          </div>

          <div className="flex shrink-0 justify-end gap-3 border-t border-gray-200 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--cares-primary)] px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <UserCheck className="h-3.5 w-3.5" />
              )}
              Mark {total} present
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
