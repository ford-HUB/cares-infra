import { ContentShell } from '../../components/portal/ui/content-shell'
import { PaymentSettingsForm } from '../../components/payment-settings/payment-settings-form'
import { PaymentSettingsFormSkeleton } from '../../components/payment-settings/ui/payment-settings-form-skeleton'
import { usePaymentSettingsForm } from '../../hooks/use-payment-settings-form'

export function PaymentSettingsPage() {
  const {
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
    initialized,
    error,
    onRetry,
  } = usePaymentSettingsForm()

  return (
    <ContentShell>
      <header className="mb-5">
        <h1 className="text-xl font-semibold text-gray-800">Payments</h1>
        <p className="mt-1 text-sm text-gray-500">
          Which payment methods donors are offered when they give money to CARES.
          Saving takes effect on the next donation.
        </p>
      </header>

      {/*
        A failed fetch would otherwise leave the form showing its defaults, which reads
        as the saved settings — and saving from there would switch donations off and
        clear the channels for real.
      */}
      {error ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-800">
          <span>{error}</span>
          <button
            type="button"
            onClick={onRetry}
            className="font-medium underline underline-offset-2 hover:text-red-900"
          >
            Retry
          </button>
        </div>
      ) : initialized && settings ? (
        <PaymentSettingsForm
          form={form}
          settings={settings}
          onSubmit={onSubmit}
          onReset={onReset}
          onToggleMethod={onToggleMethod}
          confirming={confirming}
          onCancelConfirm={onCancelConfirm}
          onConfirmMethod={() => void onConfirmMethod()}
          onVerifyMethod={(method) => void onVerifyMethod(method)}
          onSaveDetails={() => void onSaveDetails()}
          onSendAccountProof={(method) => void onSendAccountProof(method)}
          onConfirmAccount={(method, amount) => void onConfirmAccount(method, amount)}
          verifying={verifying}
          saving={saving}
        />
      ) : (
        <PaymentSettingsFormSkeleton />
      )}
    </ContentShell>
  )
}
