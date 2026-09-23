import type {
  DonationPaymentRow,
  DonationRow,
} from '../repositories/donations-repository';
import type {
  DonationDto,
  DonationPaymentDto,
} from '../dto/donations-mobile-dto';
import type { SiteDonationDto } from '../dto/donations-site-dto';

export function toDonationPaymentDto(
  row: DonationPaymentRow,
): DonationPaymentDto {
  return {
    donation_payment_id: row.donation_payment_id,
    campaign_id: row.campaign_id,
    campaign_title: row.campaign_title,
    event_id: row.event_id,
    amount: row.amount,
    currency: row.currency,
    method: row.method,
    status: row.status,
    gateway_reference: row.gateway_reference,
    payment_reference: row.payment_reference,
    payment_channel: row.payment_channel,
    checkout_url: row.checkout_url,
    qr_string: row.qr_string,
    expires_at: row.expires_at?.toISOString() ?? null,
    paid_at: row.paid_at?.toISOString() ?? null,
    failure_reason: row.failure_reason,
    donation_id: row.donation?.donation_id ?? null,
    created_at: row.createdAt.toISOString(),
  };
}

/** `DN-0007` — the tracking number both the portal and the app print. */
export function formatDonationReference(sequence: number): string {
  return `DN-${String(sequence).padStart(4, '0')}`;
}

/** Calendar day as `YYYY-MM-DD`; delivery dates carry no time of their own. */
function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function toDonationDto(row: DonationRow): DonationDto {
  return {
    donation_id: row.donation_id,
    reference: formatDonationReference(row.sequence),
    kind: row.kind,
    status: row.status,
    event_id: row.event_id,
    event_title: row.event.title,
    amount: row.amount,
    payment_id: row.payment_id,
    method: row.payment?.method ?? null,
    payment_reference:
      row.payment?.payment_reference ?? row.payment?.gateway_reference ?? null,
    goods_type: row.goods_type,
    goods_item: row.goods_item,
    goods_quantity: row.goods_quantity,
    donor_contact: row.donor_contact,
    delivery_date: row.delivery_date ? toDateOnly(row.delivery_date) : null,
    confirmed_at: row.confirmed_at?.toISOString() ?? null,
    trail: row.trail.map((entry) => ({
      donation_trail_entry_id: entry.donation_trail_entry_id,
      status: entry.status,
      note: entry.note,
      actor_label: entry.actor_label,
      notified_email: entry.notified_email,
      created_at: entry.createdAt.toISOString(),
    })),
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

export function toSiteDonationDto(row: DonationRow): SiteDonationDto {
  return {
    ...toDonationDto(row),
    donor: {
      user_id: row.user.user_id,
      name: `${row.user.firstname} ${row.user.lastname}`.trim(),
      email: row.user.accounts[0]?.email ?? '',
      phone: row.user.phone_number || null,
    },
  };
}
