import type { DonationKind, DonationStatus } from '../types/internal-donation'

export const DONATION_STATUS_FILTER_ALL = 'all'
export type DonationStatusFilter =
  | DonationStatus
  | typeof DONATION_STATUS_FILTER_ALL

export const DONATION_KIND_LABELS: Record<DonationKind, string> = {
  money: 'Money',
  goods: 'Goods',
}

export const DONATION_STATUS_LABELS: Record<DonationStatus, string> = {
  pledged: 'Pledged',
  awaiting_pickup: 'Awaiting Drop-off',
  verifying: 'Verifying',
  confirmed: 'Confirmed',
  declined: 'Declined',
  cancelled: 'Cancelled',
}

/** Goods need a drop-off at the CARES Office before verification; money skips it. */
export const DONATION_FLOW: Record<DonationKind, DonationStatus[]> = {
  goods: ['pledged', 'awaiting_pickup', 'verifying', 'confirmed'],
  money: ['pledged', 'verifying', 'confirmed'],
}

/** Spans both kinds, so it can't come from one `DONATION_FLOW`. */
export const DONATION_ALL_STATUSES: DonationStatus[] = [
  'pledged',
  'awaiting_pickup',
  'verifying',
  'confirmed',
  'declined',
  'cancelled',
]

export const DONATION_OPEN_STATUSES: DonationStatus[] = [
  'pledged',
  'awaiting_pickup',
  'verifying',
]

export const DONATION_STATUS_HINTS: Record<DonationStatus, string> = {
  pledged: 'Donor committed the donation — nothing has arrived yet',
  awaiting_pickup: 'Donor is expected to hand the item in at the CARES Office on their delivery date',
  verifying: 'Being counted and checked against what was pledged',
  confirmed: 'Director confirmed the donation was received',
  declined: 'Never arrived or could not be verified',
  cancelled: 'The donor withdrew the pledge from the app before dropping it off',
}

export function nextDonationStatus(
  kind: DonationKind,
  status: DonationStatus,
): DonationStatus | null {
  const flow = DONATION_FLOW[kind]
  const index = flow.indexOf(status)
  if (index === -1 || index === flow.length - 1) return null
  return flow[index + 1]
}

export const DONATION_ADVANCE_LABELS: Record<DonationStatus, string> = {
  pledged: 'Reopen as pledged',
  awaiting_pickup: 'Mark awaiting drop-off',
  verifying: 'Start verifying',
  confirmed: 'Confirm received',
  declined: 'Decline donation',
  cancelled: 'Cancelled by donor',
}

export const DONATION_MAIL_SUBJECTS: Record<DonationStatus, string> = {
  pledged: 'We received your donation pledge',
  awaiting_pickup: 'Your donation is logged for drop-off',
  verifying: 'We are verifying your donation',
  confirmed: 'Your donation is confirmed — thank you',
  declined: 'Update on your donation',
  cancelled: 'Your donation was cancelled',
}

export function formatDonationReference(sequence: number): string {
  return `DN-${String(sequence).padStart(4, '0')}`
}

export const DONATION_SKELETON_ROWS = 6

export const DONATION_TABLE_COLUMNS = [
  { key: 'reference', label: 'Reference' },
  { key: 'donor', label: 'Donor' },
  { key: 'kind', label: 'Type' },
  { key: 'event', label: 'Event' },
  { key: 'detail', label: 'Donation' },
  { key: 'status', label: 'Status' },
  { key: 'updated', label: 'Updated' },
] as const

