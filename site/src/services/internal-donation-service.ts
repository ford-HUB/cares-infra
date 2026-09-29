import { GOODS_TYPE_OPTIONS } from '../constants/event'
import type {
  DonationKind,
  DonationStatus,
  DonationTimelineEntry,
  InternalDonation,
} from '../types/internal-donation'
import { apiClient, parseApiError } from './api-client'

/**
 * The donation ledger — `/api/v1/donations/site`. A money row is opened by the
 * gateway once a checkout is paid, a goods row when the donor pledges in the app;
 * the director walks either one to confirmed here. Every move writes a trail entry
 * and puts a notice on the donor's feed.
 */

/** Backend wraps successful responses in an { ok, data } envelope. */
type ApiEnvelope<T> = { ok: true; message?: string; data: T }

type WireKind = 'MONEY' | 'GOODS'
type WireStatus =
  | 'PLEDGED'
  | 'AWAITING_PICKUP'
  | 'VERIFYING'
  | 'CONFIRMED'
  | 'DECLINED'
  | 'CANCELLED'

interface DonationTrailEntryResponse {
  donation_trail_entry_id: string
  status: WireStatus
  note: string | null
  actor_label: string
  notified_email: string | null
  created_at: string
}

interface SiteDonationResponse {
  donation_id: string
  reference: string
  kind: WireKind
  status: WireStatus
  event_id: number
  event_title: string
  amount: number
  method: 'GCASH' | 'QRPH' | 'CARD' | 'BANK_TRANSFER' | null
  payment_reference: string | null
  goods_type: string | null
  goods_item: string | null
  goods_quantity: number | null
  donor_contact: string | null
  delivery_date: string | null
  trail: DonationTrailEntryResponse[]
  created_at: string
  updated_at: string
  donor: { user_id: string; name: string; email: string; phone: string | null }
}

const KIND_FROM_WIRE: Record<WireKind, DonationKind> = {
  MONEY: 'money',
  GOODS: 'goods',
}

const STATUS_FROM_WIRE: Record<WireStatus, DonationStatus> = {
  PLEDGED: 'pledged',
  AWAITING_PICKUP: 'awaiting_pickup',
  VERIFYING: 'verifying',
  CONFIRMED: 'confirmed',
  DECLINED: 'declined',
  CANCELLED: 'cancelled',
}

const STATUS_TO_WIRE: Record<DonationStatus, WireStatus> = {
  pledged: 'PLEDGED',
  awaiting_pickup: 'AWAITING_PICKUP',
  verifying: 'VERIFYING',
  confirmed: 'CONFIRMED',
  declined: 'DECLINED',
  cancelled: 'CANCELLED',
}

const METHOD_LABELS: Record<NonNullable<SiteDonationResponse['method']>, string> = {
  GCASH: 'GCash',
  QRPH: 'QR Ph',
  CARD: 'Card',
  BANK_TRANSFER: 'Bank Transfer',
}

function goodsTypeLabel(id: string | null): string {
  if (!id) return 'Goods'
  return GOODS_TYPE_OPTIONS.find((type) => type.id === id)?.name ?? id
}

function toTimelineEntry(row: DonationTrailEntryResponse): DonationTimelineEntry {
  return {
    id: row.donation_trail_entry_id,
    status: STATUS_FROM_WIRE[row.status],
    note: row.note ?? undefined,
    actor: row.actor_label,
    at: row.created_at,
    notifiedEmail: row.notified_email ?? undefined,
  }
}

function toDonation(row: SiteDonationResponse): InternalDonation {
  const kind = KIND_FROM_WIRE[row.kind]
  return {
    id: row.donation_id,
    reference: row.reference,
    kind,
    status: STATUS_FROM_WIRE[row.status],
    donor: {
      name: row.donor.name,
      email: row.donor.email,
      phone: row.donor.phone ?? undefined,
      type: 'Individual',
    },
    eventId: row.event_id,
    eventTitle: row.event_title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    amount: row.amount,
    method: row.method ? METHOD_LABELS[row.method] : undefined,
    paymentReference: row.payment_reference ?? undefined,
    items:
      kind === 'goods'
        ? [
            {
              name: row.goods_item
                ? `${goodsTypeLabel(row.goods_type)} — ${row.goods_item}`
                : goodsTypeLabel(row.goods_type),
              quantity: row.goods_quantity ?? 1,
              unit: 'pcs',
            },
          ]
        : undefined,
    deliveryDate: row.delivery_date ?? undefined,
    contactNumber: row.donor_contact ?? undefined,
    timeline: row.trail.map(toTimelineEntry),
  }
}

export async function fetchInternalDonations(): Promise<InternalDonation[]> {
  try {
    const { data: body } = await apiClient.get<
      ApiEnvelope<{ items: SiteDonationResponse[] }>
    >('/api/v1/donations/site')
    return body.data.items.map(toDonation)
  } catch (error) {
    throw new Error(parseApiError(error), { cause: error })
  }
}

export interface DonationStatusChange {
  status: DonationStatus
  /** Optional, shown on the timeline and in the donor's notice. */
  note?: string
  /** Kept for the caller's toast; the server records its own actor from the token. */
  actor: string
}

export interface DonationStatusChangeResult {
  donation: InternalDonation
  /** The address the donor's notice went to. */
  notifiedEmail: string
}

export async function advanceDonationStatus(
  id: string,
  change: DonationStatusChange,
): Promise<DonationStatusChangeResult> {
  try {
    const note = change.note?.trim()
    const { data: body } = await apiClient.patch<ApiEnvelope<SiteDonationResponse>>(
      `/api/v1/donations/site/${id}/status`,
      { status: STATUS_TO_WIRE[change.status], ...(note ? { note } : {}) },
    )
    const donation = toDonation(body.data)
    return { donation, notifiedEmail: donation.donor.email }
  } catch (error) {
    throw new Error(parseApiError(error), { cause: error })
  }
}
