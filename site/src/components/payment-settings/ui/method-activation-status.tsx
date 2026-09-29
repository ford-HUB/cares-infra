import { Loader2, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  VERIFICATION_BADGE_STYLES,
  VERIFICATION_DOT_STYLES,
  VERIFICATION_LABELS,
} from '../../../constants/payment-settings'
import type { PaymentMethodMeta } from '../../../types/payment-settings'

interface MethodActivationStatusProps {
  meta?: PaymentMethodMeta
  checking: boolean
  onCheckAgain: () => void
}

/**
 * Where the channel stands with the gateway, in the channel's own card. The state is
 * the badge, the reason is the sentence under it, and "Check again" is the only thing
 * to do about it — there is nothing here the portal can fix on Xendit's behalf.
 */
export function MethodActivationStatus({
  meta,
  checking,
  onCheckAgain,
}: MethodActivationStatusProps) {
  const state = meta?.verification ?? 'NOT_VERIFIED'

  return (
    <div className="rounded-lg bg-gray-50 px-3 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[12px] font-medium',
            VERIFICATION_BADGE_STYLES[state],
          )}
        >
          <span
            className={cn('h-1.5 w-1.5 rounded-full', VERIFICATION_DOT_STYLES[state])}
          />
          {VERIFICATION_LABELS[state]}
        </span>

        <button
          type="button"
          onClick={onCheckAgain}
          disabled={checking}
          className="inline-flex items-center gap-1.5 text-[12px] font-medium text-gray-600 underline-offset-2 transition-colors hover:text-gray-900 hover:underline focus-visible:ring-2 focus-visible:ring-[var(--cares-primary)] focus-visible:outline-none disabled:opacity-60"
        >
          {checking ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          Check again
        </button>
      </div>

      {meta?.verificationMessage && (
        <p className="mt-1.5 text-[12px] leading-relaxed text-gray-500">
          {meta.verificationMessage}
        </p>
      )}

      {meta?.verifiedAt && (
        <p className="mt-1 text-[11px] text-gray-400">
          Last checked {new Date(meta.verifiedAt).toLocaleString()}
        </p>
      )}
    </div>
  )
}
