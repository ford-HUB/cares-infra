import type { DepartmentStatistics } from '../types/department-statistics'

const CSV_HEADERS = [
  'Month',
  'Events Held',
  'Registrations',
  'Attended',
  'Attendance Rate',
  'Service Hours',
]

function escapeCell(value: string | number) {
  return `"${String(value).replace(/"/g, '""')}"`
}

/** Downloads the month-by-month table behind the charts as a CSV — no server round-trip. */
export function exportDepartmentStatisticsCsv(
  statistics: DepartmentStatistics,
  filename: string,
) {
  const rows = statistics.monthly.map((row) =>
    [
      row.period,
      row.eventsHeld,
      row.registrations,
      row.attended,
      row.registrations > 0
        ? `${((row.attended / row.registrations) * 100).toFixed(1)}%`
        : '0%',
      row.serviceHours,
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
