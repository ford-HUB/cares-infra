import { Check } from 'lucide-react'
import {
  DONATION_FLOW,
  DONATION_STATUS_LABELS,
} from '../../../constants/internal-donation'
import type { DonationKind, DonationStatus } from '../../../types/internal-donation'

interface DonationProgressStepsProps {
  kind: DonationKind
  status: DonationStatus
}

/**
 * The ladder for this donation's kind, with everything up to the current rung filled
 * in. Goods show four steps (the pickup leg included), money three — the flow itself
 * comes from `DONATION_FLOW` so the two never drift apart.
 *
 * A declined donation left the ladder, so it renders as a single terminal note
 * instead of a half-filled track that implies it is still moving.
 */
export function DonationProgressSteps({ kind, status }: DonationProgressStepsProps) {
  if (status === 'declined') {
    return (
      <p className="rounded-lg bg-gray-100 px-3 py-2 text-[12px] text-gray-600">
        This donation was declined and is no longer in the tracking flow.
      </p>
    )
  }

  const flow = DONATION_FLOW[kind]
  const currentIndex = flow.indexOf(status)

  return (
    <ol className="flex items-center gap-1">
      {flow.map((step, index) => {
        const done = index < currentIndex
        const current = index === currentIndex

        return (
          <li key={step} className="flex flex-1 items-center gap-1">
            <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${
                  done
                    ? 'bg-[var(--cares-primary)] text-white'
                    : current
                      ? 'bg-white text-[var(--cares-primary)] ring-2 ring-[var(--cares-primary)]'
                      : 'bg-gray-100 text-gray-400'
                }`}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : index + 1}
              </span>
              <span
                className={`text-center text-[11px] ${
                  current ? 'font-semibold text-gray-900' : 'text-gray-500'
                }`}
              >
                {DONATION_STATUS_LABELS[step]}
              </span>
            </div>

            {index < flow.length - 1 && (
              <span
                aria-hidden
                className={`mb-4 h-0.5 w-full flex-1 ${
                  index < currentIndex ? 'bg-[var(--cares-primary)]' : 'bg-gray-200'
                }`}
              />
            )}
          </li>
        )
      })}
    </ol>
  )
}
