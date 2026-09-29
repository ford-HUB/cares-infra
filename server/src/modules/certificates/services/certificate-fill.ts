import type { IssuedCertificateRow } from '../repositories/certificates-repository';

/**
 * What each placeholder on the sheet stands for. Kept in step with
 * `CERTIFICATE_TOKENS` in the templates validator, which is what the customizer
 * lets a director type.
 */
export interface CertificateFillValues {
  recipient: string;
  event: string;
  date: string;
  hours: string;
  organization: string;
}

const DATE_TIME_ZONE = process.env.TZ || 'Asia/Manila';

/** `September 21, 2026` — the form a certificate reads a date in. */
export function formatCertificateDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: DATE_TIME_ZONE,
  }).format(date);
}

/** `4 hours`, `1 hour`, `2.5 hours` — never a bare number on the sheet. */
export function formatCertificateHours(hours: number): string {
  const rounded = Math.round(hours * 10) / 10;
  const label = Number.isInteger(rounded)
    ? String(rounded)
    : rounded.toFixed(1);
  return `${label} ${rounded === 1 ? 'hour' : 'hours'}`;
}

/** The full name as it prints: first, middle (when held), last. */
export function recipientNameOf(user: {
  firstname: string;
  middle_name?: string | null;
  middleName?: string | null;
  lastname: string;
}): string {
  const middle = user.middle_name ?? user.middleName ?? '';
  return [user.firstname, middle, user.lastname]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' ');
}

export function fillValuesOf(row: IssuedCertificateRow): CertificateFillValues {
  return {
    recipient: row.recipient_name,
    event: row.event_name,
    date: formatCertificateDate(row.event_date),
    hours: formatCertificateHours(row.hours_rendered),
    organization: row.organization,
  };
}

/** Swaps every `{{token}}` in the text for its value; unknown tokens are left as typed. */
export function fillCertificateText(
  text: string,
  values: CertificateFillValues,
): string {
  return (Object.keys(values) as (keyof CertificateFillValues)[]).reduce(
    (filled, key) => filled.split(`{{${key}}}`).join(values[key]),
    text,
  );
}
