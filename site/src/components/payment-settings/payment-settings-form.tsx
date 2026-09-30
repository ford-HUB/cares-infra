import { Loader2, Wallet } from 'lucide-react'
import type { UseFormReturn } from 'react-hook-form'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import type {
  PaymentMethodKey,
  PaymentSettingsDetail,
} from '../../types/payment-settings'
import type { PaymentSettingsFormValues } from '../../validators/payment-settings-schema'
import { LinkAccountDialog } from './ui/link-account-dialog'
import { PaymentMethodCard } from './ui/payment-method-card'

interface PaymentSettingsFormProps {
  form: UseFormReturn<PaymentSettingsFormValues>
  settings: PaymentSettingsDetail
  onSubmit: () => void
  onReset: () => void
  /** The switch on a card — on asks for confirmation first, off is immediate. */
  onToggleMethod: (method: PaymentMethodKey, next: boolean) => void
  confirming: PaymentMethodKey | null
  onCancelConfirm: () => void
  onConfirmMethod: () => void
  onVerifyMethod: (method: PaymentMethodKey) => void
  /** Saves the form from inside the dialog, before a payout is sent to the account. */
  onSaveDetails: () => void
  onSendAccountProof: (method: PaymentMethodKey) => void
  onConfirmAccount: (method: PaymentMethodKey, amount: number) => void
  verifying: PaymentMethodKey | null
  saving: boolean
}

/**
 * The screen answers one question — which payment methods can donors use right now —
 * so the count of live methods leads, and the four channel cards are the page's real
 * content. The gateway credentials are deliberately not here: connecting the Xendit
 * account is its own job, and this screen is about what CARES offers.
 */
export function PaymentSettingsForm({
  form,
  settings,
  onSubmit,
  onReset,
  onToggleMethod,
  confirming,
  onCancelConfirm,
  onConfirmMethod,
  onVerifyMethod,
  onSaveDetails,
  onSendAccountProof,
  onConfirmAccount,
  verifying,
  saving,
}: PaymentSettingsFormProps) {
  const {
    register,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = form

  const enabled = watch('enabled')
  const methods = watch('methods')
  const liveCount = methods.filter((method) => method.enabled).length

  const setEnabled = (value: boolean) =>
    setValue('enabled', value, { shouldDirty: true })

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Card size="sm" className="shadow-sm">
        <CardContent className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="flex items-center gap-3 lg:w-64 lg:shrink-0">
            <span
              className={cn(
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors',
                enabled && liveCount > 0
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'bg-gray-100 text-gray-400',
              )}
            >
              <Wallet className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] tracking-wider text-gray-500 uppercase">
                Methods offered
              </p>
              <p className="flex items-baseline gap-1.5">
                <span className="text-2xl leading-tight font-semibold text-gray-900 tabular-nums">
                  {liveCount}
                </span>
                <span className="text-[13px] text-gray-400 tabular-nums">
                  of {methods.length}
                </span>
              </p>
            </div>
          </div>

          <div className="hidden w-px self-stretch bg-gray-100 lg:block" />

          {/* The bar is the four channels: how much of what CARES could offer it does. */}
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-gray-100">
              {methods.map((method) => (
                <div
                  key={method.method}
                  className={cn(
                    'h-full flex-1 rounded-full transition-colors',
                    method.enabled && enabled ? 'bg-emerald-500' : 'bg-gray-200',
                  )}
                />
              ))}
            </div>
            <p className="text-[12px] text-gray-500">
              {!enabled
                ? 'Online donations are switched off — donors are shown goods donations only.'
                : liveCount === 0
                  ? 'Nothing is offered yet. Switch on a method below.'
                  : `Donors can pay with ${methods
                      .filter((method) => method.enabled)
                      .map(
                        (method) =>
                          settings.meta.find((entry) => entry.method === method.method)
                            ?.defaultLabel ?? method.method,
                      )
                      .join(', ')}.`}
            </p>
          </div>

          <div className="hidden w-px self-stretch bg-gray-100 lg:block" />

          <label className="flex shrink-0 items-center gap-2.5">
            <Switch
              checked={enabled}
              onCheckedChange={setEnabled}
              aria-label="Accept online donations"
            />
            <span className="text-[13px] font-medium text-gray-700">
              Accept online donations
            </span>
          </label>
        </CardContent>
      </Card>

      {errors.methods?.message && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-800">
          {errors.methods.message}
        </p>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        {methods.map((method, index) => (
          <PaymentMethodCard
            key={method.method}
            index={index}
            method={method.method}
            meta={settings.meta.find((entry) => entry.method === method.method)}
            enabled={method.enabled}
            onEnabledChange={(value) => onToggleMethod(method.method, value)}
            checking={verifying === method.method}
            onCheckAgain={() => onVerifyMethod(method.method)}
            accountNumber={method.accountNumber}
            onSendAccountProof={() => onSendAccountProof(method.method)}
            onConfirmAccount={(amount) => onConfirmAccount(method.method, amount)}
            channelCodes={method.channelCodes}
            onChannelCodesChange={(codes) =>
              setValue(`methods.${index}.channelCodes`, codes, { shouldDirty: true })
            }
            register={register}
            errors={errors.methods?.[index]}
          />
        ))}
      </div>

      <LinkAccountDialog
        method={confirming}
        index={methods.findIndex((entry) => entry.method === confirming)}
        meta={settings.meta.find((entry) => entry.method === confirming)}
        accountNumber={
          methods.find((entry) => entry.method === confirming)?.accountNumber ?? ''
        }
        register={register}
        errors={
          errors.methods?.[methods.findIndex((entry) => entry.method === confirming)]
        }
        busy={saving || verifying === confirming}
        onSaveDetails={onSaveDetails}
        onSendProof={() => confirming && onSendAccountProof(confirming)}
        onConfirmAmount={(amount) =>
          confirming && onConfirmAccount(confirming, amount)
        }
        onOffer={onConfirmMethod}
        onCancel={onCancelConfirm}
      />

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={saving || !isDirty}
          className="flex items-center gap-2 rounded-lg bg-[var(--cares-primary)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--cares-primary-hover)] focus-visible:ring-2 focus-visible:ring-[var(--cares-primary)] focus-visible:outline-none disabled:opacity-60"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saving ? 'Saving...' : 'Save changes'}
        </button>

        <button
          type="button"
          onClick={onReset}
          disabled={saving || !isDirty}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-[var(--cares-primary)] focus-visible:outline-none disabled:opacity-60"
        >
          Discard changes
        </button>

        {settings.updatedAt && (
          <span className="text-[12px] text-gray-400">
            Last saved {new Date(settings.updatedAt).toLocaleString()}
          </span>
        )}
      </div>
    </form>
  )
}
