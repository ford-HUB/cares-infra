import { LOGIN_OUTCOME_LABELS, LOGIN_SOURCE_LABELS } from '../constants/login-activity'
import { formatTimestamp } from '../constants/formatting'
import type { LoginActivityEntry } from '../types/login-activity'

const CSV_HEADERS = [
  'Date & Time',
  'Name',
  'Email',
  'Role',
  'IP Address',
  'Source',
  'Outcome',
  'Reason',
  'User Agent',
]

function escapeCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`
}

/** Downloads the given attempts as a CSV file from the browser — no server round-trip. */
export function exportLoginActivityCsv(
  entries: LoginActivityEntry[],
  filename = 'login-activity.csv',
) {
  const rows = entries.map((entry) =>
    [
      formatTimestamp(entry.createdAt),
      [entry.firstName, entry.lastName].filter(Boolean).join(' '),
      entry.email,
      entry.role ?? '',
      entry.ipAddress,
      LOGIN_SOURCE_LABELS[entry.source] ?? entry.source,
      LOGIN_OUTCOME_LABELS[entry.outcome] ?? entry.outcome,
      entry.failureReason ?? '',
      entry.userAgent ?? '',
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
