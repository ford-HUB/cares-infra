import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { useSecurityPolicyStore } from '../store/security-policy-store'
import type { SecurityPolicyDetail } from '../types/security-policy'
import {
  securityPolicyDefaultValues,
  securityPolicySchema,
  type SecurityPolicyFormValues,
} from '../validators/security-policy-schema'

/**
 * Drops the audit fields. They ride along on the detail response but are not editable,
 * and the server rejects unknown keys — so anything left in the form state here comes
 * back as a validation error on save.
 */
function toFormValues(policy: SecurityPolicyDetail): SecurityPolicyFormValues {
  return {
    passwordMinLength: policy.passwordMinLength,
    passwordRequireUppercase: policy.passwordRequireUppercase,
    passwordRequireLowercase: policy.passwordRequireLowercase,
    passwordRequireNumber: policy.passwordRequireNumber,
    passwordRequireSymbol: policy.passwordRequireSymbol,

    lockoutEnabled: policy.lockoutEnabled,
    lockoutMaxAttempts: policy.lockoutMaxAttempts,
    lockoutWindowMinutes: policy.lockoutWindowMinutes,
    lockoutDurationMinutes: policy.lockoutDurationMinutes,

    sessionIdleTimeoutMinutes: policy.sessionIdleTimeoutMinutes,
    sessionMaxDurationHours: policy.sessionMaxDurationHours,
    maxConcurrentSessions: policy.maxConcurrentSessions,

    loginHoursEnabled: policy.loginHoursEnabled,
    loginHoursStartMinute: policy.loginHoursStartMinute,
    loginHoursEndMinute: policy.loginHoursEndMinute,

    ipAllowlist: policy.ipAllowlist,
  }
}

export function useSecurityPolicyForm() {
  const policy = useSecurityPolicyStore((state) => state.policy)
  const loading = useSecurityPolicyStore((state) => state.loading)
  const initialized = useSecurityPolicyStore((state) => state.initialized)
  const saving = useSecurityPolicyStore((state) => state.saving)
  const error = useSecurityPolicyStore((state) => state.error)
  const fetchPolicy = useSecurityPolicyStore((state) => state.fetchPolicy)
  const savePolicy = useSecurityPolicyStore((state) => state.savePolicy)

  const form = useForm<SecurityPolicyFormValues>({
    resolver: zodResolver(securityPolicySchema),
    defaultValues: securityPolicyDefaultValues,
  })

  useEffect(() => {
    void fetchPolicy()
  }, [fetchPolicy])

  /**
   * Resets rather than sets each field, so the saved policy becomes the form's baseline
   * — that is what makes `isDirty` mean "differs from what is stored" and lets the Save
   * button stay disabled until something actually changed.
   */
  useEffect(() => {
    if (!policy) return

    form.reset(toFormValues(policy))
  }, [policy, form])

  const onSubmit = form.handleSubmit(async (values) => {
    const result = await savePolicy(values)

    if (result.ok) {
      toast.success('Security policy updated')
      return
    }

    toast.error(result.message ?? 'Failed to save the security policy')
  })

  return {
    form,
    onSubmit,
    onReset: () => form.reset(),
    updatedAt: policy?.updatedAt,
    loading: loading && !initialized,
    initialized,
    saving,
    error,
    onRetry: () => void fetchPolicy(),
  }
}
