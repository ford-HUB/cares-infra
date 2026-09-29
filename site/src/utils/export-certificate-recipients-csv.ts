import type {
  CertificateRecipient,
  DeployedCertificate,
} from '../types/deployed-certificate'

const CSV_HEADERS = [
  'Certificate No.',
  'Recipient',
  'Hours rendered',
  'Issued at',
  'Opened at',
] as const

function escapeCell(value: string | number): string {
  const text = String(value)
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/** The recipient roll of one deployment as a spreadsheet, one row per certificate. */
export function exportCertificateRecipientsCsv(
  deployment: DeployedCertificate,
  recipients: CertificateRecipient[],
) {
  const rows = recipients.map((row) =>
    [
      row.certificateNumber,
      row.name,
      row.hoursRendered,
      row.issuedAt,
      row.claimedAt ?? '',
    ]
      .map(escapeCell)
      .join(','),
  )

  const csv = [CSV_HEADERS.join(','), ...rows].join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))

  const link = document.createElement('a')
  link.href = url
  link.download = `${deployment.reference}-recipients.csv`
  link.click()

  URL.revokeObjectURL(url)
}
