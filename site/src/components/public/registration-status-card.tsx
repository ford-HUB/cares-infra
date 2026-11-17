import { CheckCircle2, Clock3, XCircle, type LucideIcon } from 'lucide-react'
import { Skeleton } from '../ui/skeleton'
import { formatDateTime } from '../../constants/formatting'
import type { RegistrationReviewStatus, RegistrationStatus } from '../../types/registration-status'

const STATUS_COPY: Record<
  RegistrationReviewStatus,
  { label: string; heading: string; icon: LucideIcon; tone: string }
> = {
  PENDING: {
    label: 'Under review',
    heading: 'Your registration is under review',
    icon: Clock3,
    tone: 'bg-amber-50 text-amber-800 ring-amber-200',
  },
  ACCEPTED: {
    label: 'Approved',
    heading: 'Your account is approved',
    icon: CheckCircle2,
    tone: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  },
  REJECTED: {
    label: 'Not approved',
    heading: 'Your registration was not approved',
    icon: XCircle,
    tone: 'bg-red-50 text-red-800 ring-red-200',
  },
}

function formatDate(iso: string | null): string | null {
  return iso ? formatDateTime(iso) : null
}

/** One reviewed sign-up's status: a heading, the decision pill, and what to do next. */
export function RegistrationStatusCard({ status }: { status: RegistrationStatus }) {
  const copy = STATUS_COPY[status.status]
  const Icon = copy.icon
  const submitted = formatDate(status.submitted_at)
  const decided = formatDate(status.decided_at)

  return (
    <article className="w-full rounded-2xl bg-white p-6 shadow-[0_6px_24px_rgba(27,67,50,0.10)] ring-1 ring-black/5 sm:p-8">
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold ring-1 ${copy.tone}`}
      >
        <Icon aria-hidden className="h-3.5 w-3.5" />
        {copy.label}
      </span>

      <h1 className="mt-4 text-[22px] leading-tight font-bold text-[var(--cares-heading)] sm:text-[24px]">
        {copy.heading}
      </h1>
      <p className="mt-2 text-[14px] leading-relaxed text-[var(--cares-body)]">
        Hi {status.firstname || 'there'} — this is your {status.registration_label} registration{' '}
        <strong className="font-semibold text-[var(--cares-heading)]">{status.reference}</strong>.
      </p>

      <dl className="mt-5 grid grid-cols-1 gap-3 rounded-xl bg-[var(--cares-bg)] p-4 text-[13px] sm:grid-cols-2">
        <div>
          <dt className="text-[var(--cares-muted)]">Submitted</dt>
          <dd className="mt-0.5 font-medium text-[var(--cares-heading)]">{submitted ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-[var(--cares-muted)]">Decided</dt>
          <dd className="mt-0.5 font-medium text-[var(--cares-heading)]">
            {decided ?? 'Waiting for a director'}
          </dd>
        </div>
      </dl>

      {status.status === 'REJECTED' && (
        <p className="mt-4 rounded-xl border border-red-100 bg-red-50/60 p-4 text-[13px] leading-relaxed text-red-900">
          <span className="font-semibold">Reason:</span>{' '}
          {status.rejection_reason?.trim() || 'No reason was given.'}
        </p>
      )}

      <p className="mt-5 text-[13px] leading-relaxed text-[var(--cares-body)]">
        {status.status === 'ACCEPTED'
          ? 'You may now proceed to sign in to the CARES app with the email and password you registered.'
          : status.status === 'REJECTED'
            ? 'If you think this was a mistake, reach out to the CARES office.'
            : "A CARES director is checking your details. You can't sign in yet — we'll email you as soon as a decision is made, and this page will show it too."}
      </p>
    </article>
  )
}

/** The card's shape while the status loads. */
export function RegistrationStatusCardSkeleton() {
  return (
    <div
      aria-busy
      aria-label="Loading registration status"
      className="w-full rounded-2xl bg-white p-6 shadow-[0_6px_24px_rgba(27,67,50,0.10)] ring-1 ring-black/5 sm:p-8"
    >
      <Skeleton className="h-6 w-28 rounded-full" />
      <Skeleton className="mt-4 h-7 w-3/4" />
      <Skeleton className="mt-3 h-4 w-full" />
      <Skeleton className="mt-5 h-20 w-full rounded-xl" />
      <Skeleton className="mt-5 h-4 w-5/6" />
    </div>
  )
}
