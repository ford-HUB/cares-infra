import type { ManagedUser } from '../types/manage-users'

const CSV_HEADERS = [
  'First Name',
  'Last Name',
  'Email',
  'Role',
  'Status',
  'Department',
  'Last Sign-in IP',
  'Blocked IPs',
]

function escapeCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`
}

/** Downloads the given users as a CSV file from the browser — no server round-trip. */
export function exportUsersCsv(users: ManagedUser[], filename = 'users.csv') {
  const rows = users.map((user) =>
    [
      user.firstName,
      user.lastName,
      user.email,
      user.role,
      user.status,
      user.department ?? '',
      user.lastLoginIp ?? '',
      user.blockedIps.join(' '),
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
