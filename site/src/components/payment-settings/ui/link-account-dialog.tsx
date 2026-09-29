import { BadgeCheck, Check, Loader2, Send } from 'lucide-react'
import { useState } from 'react'
import type { FieldErrors, UseFormRegister } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  ACTIVATION_STEPS,
  PAYMENT_ACCOUNT_FIELDS,
  PAYMENT_METHOD_COLLECTS_ACCOUNT,
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHOD_LOGOS,
} from '../../../constants/payment-settings'
import type {
  PaymentMethodKey,
  PaymentMethodMeta,
} from '../../../types/payment-settings'
import type { PaymentSettingsFormValues } from '../../../validators/payment-settings-schema'
import { SandboxAmountHint } from './sandbox-amount-hint'
import { TextField } from './text-field'

interface LinkAccountDialogProps {
  /** Null keeps the dialog closed; a method opens it on that method. */
  method: PaymentMethodKey | null
  index: number
  meta?: PaymentMethodMeta
  accountNumber: string
  register: UseFormRegister<PaymentSettingsFormValues>
  errors?: FieldErrors<PaymentSettingsFormValues['methods'][number]>
  busy: boolean
  /** Saves the form so the payout goes to the number that is stored, not typed. */
  onSaveDetails: () => void
  onSendProof: () => void
  onConfirmAmount: (amount: number) => void
  onOffer: () => void
  onCancel: () => void
}

/**
 * Switching a method on, as a walk-through rather than a single yes/no: record the
 * account, prove CARES can reach it, then offer it to donors.
 *
 * It is deliberately CARES' own dialog carrying the method's mark, not an imitation of
 * the wallet's app. No gateway offers a merchant-side account-linking screen, and a
 * dialog dressed up as one would be asking a director to trust a login that isn't real.
 */
export function LinkAccountDialog({
  method,
  index,
  meta,
  accountNumber,
  register,
  errors,
  busy,
  onSaveDetails,
  onSendProof,
  onConfirmAmount,
  onOffer,
  onCancel,
}: LinkAccountDialogProps) {
  const [amount, setAmount] = useState('')
  if (!method) return <Dialog open={false} onOpenChange={onCancel} />

  const label = meta?.defaultLabel ?? PAYMENT_METHOD_LABELS[method]
  const fields = PAYMENT_ACCOUNT_FIELDS[method]
  const needsAccount = PAYMENT_METHOD_COLLECTS_ACCOUNT[method]
  const proof = meta?.accountProof ?? 'NOT_STARTED'

  // The step is read off the data, never held in state: a reload, a refetch or a
  // failed payout all land the director exactly where they actually are.
  const step: 1 | 2 | 3 | 4 = !needsAccount
    ? 4
    : proof === 'VERIFIED'
      ? 4
      : proof === 'AWAITING_CONFIRMATION'
        ? 3
        : accountNumber.trim() && !errors?.accountNumber && !errors?.accountName
          ? 2
          : 1

  const submitAmount = () => {
    const pesos = Number(amount)
    if (!Number.isInteger(pesos) || pesos <= 0) return
    onConfirmAmount(pesos)
    setAmount('')
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5 text-[15px]">
            <img
              src={PAYMENT_METHOD_LOGOS[method]}
              alt=""
              className="h-8 w-8 rounded-lg"
            />
            Offer {label} to donors
          </DialogTitle>
          <DialogDescription className="text-[12px]">
            {needsAccount
              ? 'Three steps: record the account, prove CARES can reach it, then go live.'
              : 'Confirm what CARES is about to switch on.'}
          </DialogDescription>
        </DialogHeader>

        {needsAccount && <StepRail step={step} />}

        {step === 1 && (
          <div className="space-y-3">
            <TextField
              id={`link-${method}-number`}
              label={fields.numberLabel}
              type={fields.numberType}
              placeholder={fields.numberPlaceholder}
              hint={fields.hint}
              error={errors?.accountNumber?.message}
              registration={register(`methods.${index}.accountNumber`)}
            />
            <TextField
              id={`link-${method}-name`}
              label={fields.nameLabel}
              placeholder={fields.namePlaceholder}
              error={errors?.accountName?.message}
              registration={register(`methods.${index}.accountName`)}
            />
            <p className="text-[12px] text-gray-500">
              This is what donors see on their receipt. Where Xendit pays out is set in
              the Xendit dashboard.
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-2">
            <p className="text-[13px] text-gray-700">
              CARES will send a small payout of a random amount to{' '}
              <span className="font-medium tabular-nums">{accountNumber}</span>.
            </p>
            <p className="text-[12px] text-gray-500">
              You will be asked what arrived — that is what proves the account is
              CARES', since no gateway will confirm who owns a wallet number.
            </p>
            {meta?.accountProofMessage && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-800">
                {meta.accountProofMessage}
              </p>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-2">
            <p className="text-[13px] text-gray-700">
              {meta?.accountProofMessage ??
                'Check the account and enter the exact amount that arrived.'}
            </p>

            <SandboxAmountHint amount={meta?.accountProofSandboxAmount} />
            <div className="w-40">
              <label
                htmlFor={`link-${method}-amount`}
                className="mb-1 block text-[11px] tracking-wider text-gray-500 uppercase"
              >
                Amount received (₱)
              </label>
              <Input
                id={`link-${method}-amount`}
                type="number"
                min={1}
                inputMode="numeric"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    submitAmount()
                  }
                }}
                placeholder="0"
                className="tabular-nums"
              />
            </div>
            {meta && meta.accountProofAttempts > 0 && (
              <p className="text-[12px] text-amber-700">
                {meta.accountProofAttempts} wrong{' '}
                {meta.accountProofAttempts === 1 ? 'answer' : 'answers'} so far.
              </p>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-3">
            {needsAccount && (
              <p className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-[13px] text-emerald-800">
                <BadgeCheck className="h-4 w-4" />
                Account verified — CARES can reach it.
              </p>
            )}
            <ul className="space-y-1.5">
              {ACTIVATION_STEPS.map((activation) => (
                <li
                  key={activation}
                  className="flex gap-2 text-[13px] text-gray-600"
                >
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                  {activation}
                </li>
              ))}
            </ul>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>

          {step === 1 && (
            <Button type="button" onClick={onSaveDetails} disabled={busy}>
              Save account
            </Button>
          )}
          {step === 2 && (
            <Button type="button" onClick={onSendProof} disabled={busy}>
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              Send test payout
            </Button>
          )}
          {step === 3 && (
            <Button type="button" onClick={submitAmount} disabled={busy || !amount}>
              Confirm amount
            </Button>
          )}
          {step === 4 && (
            <Button type="button" onClick={onOffer} disabled={busy}>
              {busy ? 'Switching on...' : `Offer ${label}`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Where the director is in the walk-through, and what is still ahead. */
function StepRail({ step }: { step: 1 | 2 | 3 | 4 }) {
  const steps = ['Account', 'Test payout', 'Confirm', 'Go live']

  return (
    <ol className="flex items-center gap-1.5">
      {steps.map((name, index) => {
        const position = index + 1
        const done = position < step
        const current = position === step

        return (
          <li key={name} className="flex flex-1 items-center gap-1.5">
            <span
              className={cn(
                'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold',
                done && 'bg-emerald-100 text-emerald-700',
                current && 'bg-[var(--cares-primary)] text-white',
                !done && !current && 'bg-gray-100 text-gray-400',
              )}
            >
              {done ? <Check className="h-3 w-3" /> : position}
            </span>
            <span
              className={cn(
                'truncate text-[11px]',
                current ? 'font-medium text-gray-700' : 'text-gray-400',
              )}
            >
              {name}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
