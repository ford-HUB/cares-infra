export type DonationKind = 'money' | 'goods'

/** Goods: pledged → awaiting_pickup → verifying → confirmed; money skips the drop-off. `declined` is the director's exit, `cancelled` the donor's. */
export type DonationStatus =
  | 'pledged'
  | 'awaiting_pickup'
  | 'verifying'
  | 'confirmed'
  | 'declined'
  | 'cancelled'

export interface DonationDonor {
  name: string
  email: string
  phone?: string
  type: string
}

export interface DonationGoodsItem {
  name: string
  quantity: number
  unit: string
}

export interface DonationTimelineEntry {
  id: string
  status: DonationStatus
  note?: string
  /** `System` for the donor-side submission. */
  actor: string
  at: string
  /** Unset when no mail was sent. */
  notifiedEmail?: string
}

export interface InternalDonation {
  id: string
  /** e.g. `DN-0007`. */
  reference: string
  kind: DonationKind
  status: DonationStatus
  donor: DonationDonor
  eventId: number
  eventTitle: string
  createdAt: string
  updatedAt: string
  /** Money given, or the declared worth of goods. */
  amount: number
  /** Money only. */
  method?: string
  /** Money only. */
  paymentReference?: string
  items?: DonationGoodsItem[]
  /** Goods only: planned CARES Office drop-off day. */
  deliveryDate?: string
  /** Goods only. */
  contactNumber?: string
  timeline: DonationTimelineEntry[]
}
