/** Money is wired or handed over; goods are physical items dropped at a CARES site. */
export type DonationKind = 'money' | 'goods'

/**
 * One ladder for both kinds, walked at different speeds.
 *
 * Goods: `pledged` → `awaiting_pickup` (item is at the CARES drop-off point) →
 * `verifying` (staff counts and inspects it) → `confirmed` (director signs off that
 * it was received).
 *
 * Money: `pledged` (donor says it was sent) → `verifying` (payment being matched) →
 * `confirmed` (director confirms the transfer landed). Money never has a pickup leg.
 *
 * `declined` is the terminal off-ramp for either kind — item never arrived, payment
 * never cleared.
 */
export type DonationStatus =
  | 'pledged'
  | 'awaiting_pickup'
  | 'verifying'
  | 'confirmed'
  | 'declined'

export interface DonationDonor {
  name: string
  /** Where every status-change notice is sent. */
  email: string
  phone?: string
  /** `individual`, `alumni`, `company`, … — shown beside the name. */
  type: string
}

export interface DonationGoodsItem {
  name: string
  quantity: number
  /** `pcs`, `sacks`, `boxes`, … */
  unit: string
}

/**
 * One entry in the donation's audit trail. Every status move writes one, and every
 * one that notified the donor carries the address it went to — the page's proof that
 * the donor was kept in the loop.
 */
export interface DonationTimelineEntry {
  id: string
  status: DonationStatus
  note?: string
  /** Portal account that made the move; `System` for the donor-side submission. */
  actor: string
  at: string
  /** Donor address the status notice was mailed to; unset when no mail was sent. */
  notifiedEmail?: string
}

export interface InternalDonation {
  id: string
  /** Human tracking number — `DN-0007`. */
  reference: string
  kind: DonationKind
  status: DonationStatus
  donor: DonationDonor
  /** Event the donation was raised for. */
  eventId: string
  eventTitle: string
  createdAt: string
  updatedAt: string
  /** Peso value: the amount given for money, the declared worth of the goods. */
  amount: number
  /** Money only — `GCash`, `Bank Transfer`, `Cash`. */
  method?: string
  /** Money only — the donor's transfer/OR reference. */
  paymentReference?: string
  /** Goods only. */
  items?: DonationGoodsItem[]
  /** Goods only — CARES site the donor brings the items to. */
  dropOffLocation?: string
  timeline: DonationTimelineEntry[]
}
