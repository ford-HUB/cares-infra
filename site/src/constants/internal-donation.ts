import type { DonationKind, DonationStatus } from '../types/internal-donation'

export const DONATION_STATUS_FILTER_ALL = 'all'
export type DonationStatusFilter =
  | DonationStatus
  | typeof DONATION_STATUS_FILTER_ALL

/** The TYPE column — the ledger is one list now, so each row says which it is. */
export const DONATION_KIND_LABELS: Record<DonationKind, string> = {
  money: 'Money',
  goods: 'Goods',
}

export const DONATION_STATUS_LABELS: Record<DonationStatus, string> = {
  pledged: 'Pledged',
  awaiting_pickup: 'Waiting to Pickup',
  verifying: 'Verifying',
  confirmed: 'Confirmed',
  declined: 'Declined',
}

/**
 * The two ladders. Goods pass through a pickup leg because the item physically has
 * to reach a CARES site before anyone can verify it; money skips straight to
 * verification once the donor says it was sent.
 */
export const DONATION_FLOW: Record<DonationKind, DonationStatus[]> = {
  goods: ['pledged', 'awaiting_pickup', 'verifying', 'confirmed'],
  money: ['pledged', 'verifying', 'confirmed'],
}

/**
 * Every rung either kind can sit on, in ladder order — the status filter spans both
 * kinds, so it can't be built from one kind's `DONATION_FLOW`.
 */
export const DONATION_ALL_STATUSES: DonationStatus[] = [
  'pledged',
  'awaiting_pickup',
  'verifying',
  'confirmed',
  'declined',
]

/** Anything the director still owes an action on. */
export const DONATION_OPEN_STATUSES: DonationStatus[] = [
  'pledged',
  'awaiting_pickup',
  'verifying',
]

export const DONATION_STATUS_HINTS: Record<DonationStatus, string> = {
  pledged: 'Donor committed the donation — nothing has arrived yet',
  awaiting_pickup: 'Item is at the CARES drop-off point, waiting to be collected',
  verifying: 'Being counted and checked against what was pledged',
  confirmed: 'Director confirmed the donation was received',
  declined: 'Never arrived or could not be verified',
}

/** The next rung for a donation of this kind, or null when it is already terminal. */
export function nextDonationStatus(
  kind: DonationKind,
  status: DonationStatus,
): DonationStatus | null {
  const flow = DONATION_FLOW[kind]
  const index = flow.indexOf(status)
  if (index === -1 || index === flow.length - 1) return null
  return flow[index + 1]
}

/** Label for the one-click advance button, phrased as the action being taken. */
export const DONATION_ADVANCE_LABELS: Record<DonationStatus, string> = {
  pledged: 'Reopen as pledged',
  awaiting_pickup: 'Mark waiting to pickup',
  verifying: 'Start verifying',
  confirmed: 'Confirm received',
  declined: 'Decline donation',
}

/**
 * Subject line of the notice the donor gets on every move. The body is composed in
 * the service — the portal owns the wording so it stays the same across both kinds.
 */
export const DONATION_MAIL_SUBJECTS: Record<DonationStatus, string> = {
  pledged: 'We received your donation pledge',
  awaiting_pickup: 'Your donation is logged for pickup',
  verifying: 'We are verifying your donation',
  confirmed: 'Your donation is confirmed — thank you',
  declined: 'Update on your donation',
}

export function formatDonationReference(sequence: number): string {
  return `DN-${String(sequence).padStart(4, '0')}`
}

/** Rows drawn while the first fetch is in flight. */
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

