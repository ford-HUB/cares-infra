import {
  ATTENDEE_STATUS_LABELS,
  GEO_VALIDATION_METHOD_LABELS,
} from '../constants/attendees'
import { formatTimestamp } from '../constants/formatting'
import type { EventAttendee } from '../types/attendee'

const CSV_HEADERS = [
  'Event',
  'Event Date',
  'First Name',
  'Last Name',
  'Email',
  'Contact Number',
  'Department',
  'Year Level',
  'Status',
  'Registered On',
  'First Ping',
  'Last Ping',
  'Method',
  'Hours Rendered',
  'Remarks',
]

function escapeCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`
}

/** Downloads the given roster as a CSV file from the browser — no server round-trip. */
export function exportAttendeesCsv(
  attendees: EventAttendee[],
  filename = 'event-attendees.csv',
) {
  const rows = attendees.map((attendee) =>
    [
      attendee.eventTitle,
      formatTimestamp(attendee.eventDate),
      attendee.firstName,
      attendee.lastName,
      attendee.email,
      attendee.contactNumber ?? '',
      attendee.department ?? '',
      attendee.yearLevel ?? '',
      ATTENDEE_STATUS_LABELS[attendee.status],
      formatTimestamp(attendee.registeredAt),
      attendee.checkedInAt ? formatTimestamp(attendee.checkedInAt) : '',
      attendee.checkedOutAt ? formatTimestamp(attendee.checkedOutAt) : '',
      attendee.validationMethod
        ? GEO_VALIDATION_METHOD_LABELS[attendee.validationMethod]
        : '',
      attendee.hoursRendered != null ? String(attendee.hoursRendered) : '',
      attendee.remarks ?? '',
    ]
      .map(escapeCell)
      .join(','),
  )

  const csv = [CSV_HEADERS.join(','), ...rows].join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()

  URL.revokeObjectURL(url)
}
