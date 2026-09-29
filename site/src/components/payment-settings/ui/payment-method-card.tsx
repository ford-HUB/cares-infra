import type { FieldErrors, UseFormRegister } from 'react-hook-form'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import {
  ACCOUNT_DISPLAY_ONLY_NOTE,
  CARD_ACCOUNT_NOTE,
  PAYMENT_ACCOUNT_FIELDS,
  PAYMENT_CHANNEL_LABELS,
  PAYMENT_METHOD_COLLECTS_ACCOUNT,
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHOD_LOGOS,
  PAYMENT_METHOD_TAGLINES,
} from '../../../constants/payment-settings'
import type { PaymentMethodKey, PaymentMethodMeta } from '../../../types/payment-settings'
import type { PaymentSettingsFormValues } from '../../../validators/payment-settings-schema'
import { AccountProofPanel } from './account-proof-panel'
import { MethodActivationStatus } from './method-activation-status'
import { TextField } from './text-field'

interface PaymentMethodCardProps {
  index: number
  method: PaymentMethodKey
  meta?: PaymentMethodMeta
  enabled: boolean
  onEnabledChange: (enabled: boolean) => void
  /** True while this channel's activation check is in flight. */
  checking: boolean
  onCheckAgain: () => void
  /** What is typed in the account box right now — the proof is sent to this. */
  accountNumber: string
  onSendAccountProof: () => void
  onConfirmAccount: (amount: number) => void
  /** Which Xendit codes are ticked, so the checkboxes can be controlled. */
  channelCodes: string[]
  onChannelCodesChange: (codes: string[]) => void
  register: UseFormRegister<PaymentSettingsFormValues>
  errors?: FieldErrors<PaymentSettingsFormValues['methods'][number]>
}

/**
 * One channel, as its own card with its own mark — the director recognises GCash by
 * the logo long before they read the word. The switch is the whole decision; every
 * field under it is optional, so turning a method on stays one click.
 */
export function PaymentMethodCard({
  index,
  method,
  meta,
  enabled,
  onEnabledChange,
  checking,
  onCheckAgain,
  accountNumber,
  onSendAccountProof,
  onConfirmAccount,
  channelCodes,
  onChannelCodesChange,
  register,
  errors,
}: PaymentMethodCardProps) {
  const label = meta?.defaultLabel ?? PAYMENT_METHOD_LABELS[method]
  const channels = meta?.availableChannelCodes ?? []
  const collectsAccount = PAYMENT_METHOD_COLLECTS_ACCOUNT[method]
  const account = PAYMENT_ACCOUNT_FIELDS[method]

  const toggleChannel = (code: string) => {
    onChannelCodesChange(
      channelCodes.includes(code)
        ? channelCodes.filter((entry) => entry !== code)
        : [...channelCodes, code],
    )
  }

  return (
    <Card
      size="sm"
      className={cn(
        'shadow-sm transition-colors',
        !enabled && 'bg-gray-50/60 ring-foreground/5',
      )}
    >
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <img
            src={PAYMENT_METHOD_LOGOS[method]}
            alt=""
            className={cn(
              'h-11 w-11 shrink-0 rounded-xl transition-opacity',
              !enabled && 'opacity-40 grayscale',
            )}
          />

          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold text-gray-900">{label}</p>
            <p className="truncate text-[12px] text-gray-400">
              {PAYMENT_METHOD_TAGLINES[method]}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Badge variant={enabled ? 'default' : 'outline'}>
              {enabled ? 'Offered' : 'Off'}
            </Badge>
            <Switch
              checked={enabled}
              onCheckedChange={onEnabledChange}
              aria-label={`Offer ${label} to donors`}
            />
          </div>
        </div>

        {enabled && (
          <div className="space-y-3 border-t border-gray-100 pt-3">
            <MethodActivationStatus
              meta={meta}
              checking={checking}
              onCheckAgain={onCheckAgain}
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <TextField
                id={`method-${method}-display-name`}
                label="Name donors see"
                placeholder={label}
                error={errors?.displayName?.message}
                registration={register(`methods.${index}.displayName`)}
              />
              <TextField
                id={`method-${method}-instructions`}
                label="One-line instruction"
                placeholder="Blank keeps the built-in wording"
                error={errors?.instructions?.message}
                registration={register(`methods.${index}.instructions`)}
              />

              {collectsAccount && (
                <>
                  <TextField
                    id={`method-${method}-account-number`}
                    label={account.numberLabel}
                    type={account.numberType}
                    placeholder={account.numberPlaceholder}
                    hint={account.hint}
                    error={errors?.accountNumber?.message}
                    registration={register(`methods.${index}.accountNumber`)}
                  />
                  <TextField
                    id={`method-${method}-account-name`}
                    label={account.nameLabel}
                    placeholder={account.namePlaceholder}
                    error={errors?.accountName?.message}
                    registration={register(`methods.${index}.accountName`)}
                  />
                </>
              )}
            </div>

            {collectsAccount && (
              <>
                <p className="text-[11px] text-gray-400">
                  {ACCOUNT_DISPLAY_ONLY_NOTE}
                </p>

                <AccountProofPanel
                  meta={meta}
                  accountNumber={accountNumber}
                  busy={checking}
                  onSend={onSendAccountProof}
                  onConfirm={onConfirmAccount}
                />
              </>
            )}

            {channels.length > 0 && (
              <div>
                <span className="mb-1.5 block text-[11px] tracking-wider text-gray-500 uppercase">
                  Channels donors may pick
                </span>
                <div className="flex flex-wrap gap-2">
                  {channels.map((code) => {
                    const picked = channelCodes.includes(code)
                    return (
                      <button
                        key={code}
                        type="button"
                        aria-pressed={picked}
                        onClick={() => toggleChannel(code)}
                        className={cn(
                          'rounded-full border px-3 py-1 text-[12px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-[var(--cares-primary)] focus-visible:outline-none',
                          picked
                            ? 'border-transparent bg-[var(--cares-primary)] text-white'
                            : 'border-gray-200 text-gray-600 hover:bg-gray-50',
                        )}
                      >
                        {PAYMENT_CHANNEL_LABELS[code] ?? code}
                      </button>
                    )
                  })}
                </div>
                {errors?.channelCodes?.message ? (
                  <p className="mt-1 text-[11px] text-red-600">
                    {errors.channelCodes.message}
                  </p>
                ) : (
                  <p className="mt-1 text-[11px] text-gray-400">
                    {method === 'BANK_TRANSFER'
                      ? 'Pick the bank CARES holds the account with.'
                      : 'Pick none to offer all of them.'}
                  </p>
                )}
              </div>
            )}

            {!collectsAccount && (
              <p className="text-[11px] text-gray-400">{CARD_ACCOUNT_NOTE}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
