import { BadgeCheck, Loader2, Send, ShieldQuestion } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { ACCOUNT_PROOF_COPY } from '../../../constants/payment-settings'
import type { PaymentMethodMeta } from '../../../types/payment-settings'
import { SandboxAmountHint } from './sandbox-amount-hint'

interface AccountProofPanelProps {
  meta?: PaymentMethodMeta
  /** The number the proof would be sent to, so the director can check it first. */
  accountNumber: string
  busy: boolean
  onSend: () => void
  onConfirm: (amount: number) => void
}

/**
 * Proof that CARES holds the account this channel pays into. No gateway will confirm
 * who owns a GCash number, so CARES sends a small payout of an amount nobody can guess
 * and the director reports what arrived — the same trick a bank uses to verify an
 * account, and the only honest answer available.
 */
export function AccountProofPanel({
  meta,
  accountNumber,
  busy,
  onSend,
  onConfirm,
}: AccountProofPanelProps) {
  const [amount, setAmount] = useState('')
  const state = meta?.accountProof ?? 'NOT_STARTED'
  const copy = ACCOUNT_PROOF_COPY[state]
  const awaiting = state === 'AWAITING_CONFIRMATION'

  const submit = () => {
    const pesos = Number(amount)
    if (!Number.isInteger(pesos) || pesos <= 0) return
    onConfirm(pesos)
    setAmount('')
  }

  return (
    <div className={cn('rounded-lg px-3 py-2.5', copy.surface)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-[12px] font-medium">
          {state === 'VERIFIED' ? (
            <BadgeCheck className="h-3.5 w-3.5 text-emerald-600" />
          ) : (
            <ShieldQuestion className={cn('h-3.5 w-3.5', copy.icon)} />
          )}
          <span className={copy.text}>{copy.label}</span>
        </span>

        {state !== 'VERIFIED' && (
          <Button
            type="button"
            size="sm"
            variant={awaiting ? 'outline' : 'default'}
            onClick={onSend}
            disabled={busy || !accountNumber.trim()}
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            {awaiting ? 'Send another' : 'Send test payout'}
          </Button>
        )}
      </div>

      <p className="mt-1.5 text-[12px] leading-relaxed text-gray-600">
        {meta?.accountProofMessage ?? copy.hint}
      </p>

      {awaiting && (
        <div className="mt-2">
          <SandboxAmountHint amount={meta?.accountProofSandboxAmount} />
        </div>
      )}

      {awaiting && (
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <div className="w-36">
            <label
              htmlFor={`proof-amount-${meta?.method}`}
              className="mb-1 block text-[11px] tracking-wider text-gray-500 uppercase"
            >
              Amount received (₱)
            </label>
            <Input
              id={`proof-amount-${meta?.method}`}
              type="number"
              min={1}
              inputMode="numeric"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  submit()
                }
              }}
              placeholder="0"
              className="tabular-nums"
            />
          </div>

          <Button type="button" size="sm" onClick={submit} disabled={busy || !amount}>
            Confirm
          </Button>

          {meta && meta.accountProofAttempts > 0 && (
            <span className="pb-1.5 text-[11px] text-amber-700">
              {meta.accountProofAttempts} wrong{' '}
              {meta.accountProofAttempts === 1 ? 'answer' : 'answers'} so far
            </span>
          )}
        </div>
      )}

      {state === 'VERIFIED' && meta?.accountVerifiedAt && (
        <p className="mt-1 text-[11px] text-gray-400">
          Verified {new Date(meta.accountVerifiedAt).toLocaleString()}
        </p>
      )}
    </div>
  )
}
