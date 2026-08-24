import { X } from 'lucide-react'
import {
  ATTENDEE_STATUS_LABELS,
  GEO_VALIDATION_METHOD_LABELS,
} from '../../../constants/attendees'
import { formatDateShort, formatTimestamp } from '../../../constants/formatting'
import type { EventAttendee } from '../../../types/attendee'
import { AttendanceStatusBadge } from '../../portal/ui/attendance-status-badge'
import { UserAvatar } from '../../portal/ui/user-avatar'

interface AttendeeDetailModalProps {
  attendee: EventAttendee | null
  onClose: () => void
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] tracking-wider text-gray-400 uppercase">{label}</p>
      <p className="truncate text-[13px] text-gray-800" title={value}>
        {value}
      </p>
    </div>
  )
}

/** Read-only roster detail — attendance itself is validated from the app's coordinates. */
export function AttendeeDetailModal({ attendee, onClose }: AttendeeDetailModalProps) {
  if (!attendee) return null

  const hours =
    attendee.hoursRendered != null ? `${attendee.hoursRendered} hours` : 'Not yet credited'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${attendee.firstName} ${attendee.lastName} attendance detail`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="w-full max-w-lg rounded-xl bg-white shadow-lg">
        <div className="flex items-start justify-between gap-3 border-b border-gray-200 p-5">
          <div className="flex min-w-0 items-center gap-3">
            <UserAvatar
              firstName={attendee.firstName}
              lastName={attendee.lastName}
              size="lg"
            />
            <div className="min-w-0">
              <h3 className="truncate text-lg font-semibold text-gray-900">
                {attendee.firstName} {attendee.lastName}
              </h3>
              <p className="truncate text-[13px] text-gray-500">{attendee.email}</p>
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

        <div className="space-y-5 p-5">
          <div className="rounded-lg bg-gray-50 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-gray-900">
                  {attendee.eventTitle}
                </p>
                <p className="text-[12px] text-gray-500">
                  {formatDateShort(attendee.eventDate)}
                </p>
              </div>
              <AttendanceStatusBadge status={attendee.status} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Department" value={attendee.department ?? 'N/A'} />
            <Field label="Year Level" value={attendee.yearLevel ?? 'N/A'} />
            <Field label="Contact Number" value={attendee.contactNumber ?? 'N/A'} />
            <Field
              label="Attendance"
              value={ATTENDEE_STATUS_LABELS[attendee.status]}
            />
            <Field label="Registered On" value={formatTimestamp(attendee.registeredAt)} />
            <Field
              label="Method"
              value={
                attendee.validationMethod
                  ? GEO_VALIDATION_METHOD_LABELS[attendee.validationMethod]
                  : 'No coordinates yet'
              }
            />
            <Field
              label="First Ping"
              value={attendee.checkedInAt ? formatTimestamp(attendee.checkedInAt) : '—'}
            />
            <Field
              label="Last Ping"
              value={attendee.checkedOutAt ? formatTimestamp(attendee.checkedOutAt) : '—'}
            />
            <Field label="Hours Rendered" value={hours} />
          </div>

          {attendee.remarks && (
            <div>
              <p className="text-[11px] tracking-wider text-gray-400 uppercase">Remarks</p>
              <p className="mt-1 text-[13px] text-gray-700">{attendee.remarks}</p>
            </div>
          )}
        </div>

        <div className="flex justify-end border-t border-gray-200 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
