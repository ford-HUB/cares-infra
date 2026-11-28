import { ContentShell } from '../../components/portal/ui/content-shell'
import { SecurityPolicyForm } from '../../components/security-policy/security-policy-form'
import { SecurityPolicyFormSkeleton } from '../../components/security-policy/ui/security-policy-form-skeleton'
import { useSecurityPolicyForm } from '../../hooks/use-security-policy-form'

export function SecurityPoliciesPage() {
  const { form, onSubmit, onReset, saving, updatedAt, initialized, error, onRetry } =
    useSecurityPolicyForm()

  return (
    <ContentShell>
      <header className="mb-5">
        <h1 className="text-xl font-semibold text-gray-800">Security policies</h1>
        <p className="mt-1 text-sm text-gray-500">
          Password rules, account lockout, session limits, and who may reach the portal.
          Changes apply to the next sign-in and to sessions already open.
        </p>
      </header>

      {/* Otherwise defaults read as saved, and saving would overwrite the real policy. */}
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
      ) : initialized ? (
        <SecurityPolicyForm
          form={form}
          onSubmit={onSubmit}
          onReset={onReset}
          saving={saving}
          updatedAt={updatedAt}
        />
      ) : (
        <SecurityPolicyFormSkeleton />
      )}
    </ContentShell>
  )
}
