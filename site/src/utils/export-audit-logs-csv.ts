import type { AuditLogEntry } from '../types/audit-log'

const CSV_HEADERS = [
  'Timestamp',
  'Action',
  'Description',
  'Category',
  'Severity',
  'Outcome',
  'Actor',
  'Actor Email',
  'Actor Role',
  'Target Type',
  'Target',
  'IP Address',
  'Source',
  'Request ID',
  'Reason',
  'Changes',
]

function escapeCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`
}

/** Downloads the given entries as a CSV file from the browser — no server round-trip. */
export function exportAuditLogsCsv(
  entries: AuditLogEntry[],
  filename = 'audit-logs.csv',
) {
  const rows = entries.map((entry) =>
    [
      entry.createdAt,
      entry.action,
      entry.description,
      entry.category,
      entry.severity,
      entry.outcome,
      entry.actor.name,
      entry.actor.email,
      entry.actor.role,
      entry.target.type,
      entry.target.label,
      entry.ipAddress,
      entry.source,
      entry.requestId,
      entry.reason ?? '',
      entry.changes
        .map((change) => `${change.field}: ${change.before ?? '—'} → ${change.after ?? '—'}`)
        .join('; '),
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
