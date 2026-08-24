import { useState, type ReactNode } from 'react'
import { Loader2, Mail, X } from 'lucide-react'
import {
  DONATION_ADVANCE_LABELS,
  DONATION_STATUS_HINTS,
  DONATION_STATUS_LABELS,
  nextDonationStatus,
} from '../../../constants/internal-donation'
import {
  formatCurrency,
  formatDateShort,
  formatTimestamp,
} from '../../../constants/formatting'
import type { DonationStatus, InternalDonation } from '../../../types/internal-donation'
import { DonationProgressSteps } from './donation-progress-steps'
import { DonationStatusBadge } from './donation-status-badge'

interface DonationDetailModalProps {
  donation: InternalDonation | null
  saving: boolean
  /** Only the director may move a donation; everyone else reads. */
  canAct: boolean
  onClose: () => void
  onAdvance: (status: DonationStatus, note: string) => void
}

/**
 * Where a donation actually moves. The next rung is a single button rather than a
 * status dropdown — the flow is fixed per kind, so the only real choices are "move it
 * forward" and "decline it", and each carries the donor notice with it.
 */
export function DonationDetailModal({
  donation,
  saving,
  canAct,
  onClose,
  onAdvance,
}: DonationDetailModalProps) {
  // The parent keys this component by donation id, so the note starts fresh each time.
  const [note, setNote] = useState('')

  if (!donation) return null

  const next = nextDonationStatus(donation.kind, donation.status)
  const isTerminal = donation.status === 'confirmed' || donation.status === 'declined'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        aria-label={`Donation ${donation.reference}`}
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-lg"
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-200 px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-mono text-base font-semibold text-gray-900">
                {donation.reference}
              </h3>
              <DonationStatusBadge status={donation.status} />
            </div>
            <p className="mt-1 text-[13px] text-gray-600">
              {donation.donor.name} · {donation.eventTitle}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <DonationProgressSteps kind={donation.kind} status={donation.status} />

          <section className="grid gap-3 sm:grid-cols-2">
            <Field label="Donor">
              {donation.donor.name}
              <span className="block text-[11px] text-gray-500">
                {donation.donor.email}
                {donation.donor.phone ? ` · ${donation.donor.phone}` : ''}
              </span>
            </Field>
            <Field label={donation.kind === 'money' ? 'Amount' : 'Declared value'}>
              {formatCurrency(donation.amount)}
            </Field>

            {donation.kind === 'money' ? (
              <>
                <Field label="Method">{donation.method ?? '—'}</Field>
                <Field label="Payment reference">
                  {donation.paymentReference ?? '—'}
                </Field>
              </>
            ) : (
              <>
                <Field label="Drop-off location">
                  {donation.dropOffLocation ?? '—'}
                </Field>
                <Field label="Items">
                  <ul className="space-y-0.5">
                    {(donation.items ?? []).map((item) => (
                      <li key={item.name}>
                        {item.quantity} {item.unit} — {item.name}
                      </li>
                    ))}
                  </ul>
                </Field>
              </>
            )}

            <Field label="Pledged on">{formatDateShort(donation.createdAt)}</Field>
            <Field label="Current step">
              {DONATION_STATUS_HINTS[donation.status]}
            </Field>
          </section>

          <section>
            <h4 className="text-[11px] font-semibold tracking-wider text-gray-400 uppercase">
              History
            </h4>
            <ol className="mt-2 space-y-3 border-l border-gray-200 pl-4">
              {donation.timeline.map((item) => (
                <li key={item.id} className="relative">
                  <span className="absolute top-1.5 -left-[21px] h-2 w-2 rounded-full bg-[var(--cares-primary)]" />
                  <p className="text-[13px] font-medium text-gray-900">
                    {DONATION_STATUS_LABELS[item.status]}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    {formatTimestamp(item.at)} · {item.actor}
                  </p>
                  {item.note && (
                    <p className="mt-0.5 text-[12px] text-gray-600">{item.note}</p>
                  )}
                  {item.notifiedEmail && (
                    <p className="mt-0.5 flex items-center gap-1 text-[11px] text-gray-400">
                      <Mail className="h-3 w-3" />
                      Donor notified at {item.notifiedEmail}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          </section>
        </div>

        <footer className="shrink-0 space-y-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
          {isTerminal && (
            <p className="text-[12px] text-gray-500">
              {DONATION_STATUS_HINTS[donation.status]} — nothing left to action.
            </p>
          )}

          {!isTerminal && !canAct && (
            <p className="text-[12px] text-gray-500">
              Only the director can move a donation forward.
            </p>
          )}

          {!isTerminal && canAct && (
            <>
              <label
                className="block text-[13px] font-medium text-gray-700"
                htmlFor="donation-note"
              >
                Note <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <textarea
                id="donation-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={2}
                placeholder="Included in the email sent to the donor."
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-transparent focus:ring-2 focus:ring-[var(--cares-primary)] focus:outline-none"
              />

              <p className="flex items-center gap-1 text-[11px] text-gray-500">
                <Mail className="h-3 w-3" />
                {donation.donor.email} is emailed on every status change.
              </p>

              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => onAdvance('declined', note)}
                  className="h-9 rounded-lg border border-gray-300 bg-white px-4 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-60"
                >
                  {DONATION_ADVANCE_LABELS.declined}
                </button>
                {next && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => onAdvance(next, note)}
                    className="flex h-9 items-center gap-2 rounded-lg bg-[var(--cares-primary)] px-4 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                  >
                    {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {DONATION_ADVANCE_LABELS[next]}
                  </button>
                )}
              </div>
            </>
          )}
        </footer>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold tracking-wider text-gray-400 uppercase">
        {label}
      </p>
      <div className="mt-0.5 text-[13px] text-gray-800">{children}</div>
    </div>
  )
}
