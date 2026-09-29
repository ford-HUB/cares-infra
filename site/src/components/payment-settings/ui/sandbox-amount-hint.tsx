import { FlaskConical } from 'lucide-react'

interface SandboxAmountHintProps {
  /** Undefined on a live key, where reading the wallet is the whole point. */
  amount?: number
}

/**
 * A sandbox payout reaches no real wallet, so there is nothing for the director to
 * read and the check would just be a guessing game. On a development key the amount is
 * shown outright, said plainly — on a live key the server never sends it.
 */
export function SandboxAmountHint({ amount }: SandboxAmountHintProps) {
  if (amount === undefined) return null

  return (
    <p className="flex items-start gap-1.5 rounded-lg bg-sky-50 px-3 py-2 text-[12px] text-sky-900">
      <FlaskConical className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>
        Sandbox key — no money reached a real wallet, so there is nothing to check.
        CARES sent <strong className="tabular-nums">₱{amount}</strong>. On a live
        key this is hidden and you read it from the account.
      </span>
    </p>
  )
}
