import { create } from 'zustand'
import {
  getSecurityPolicy,
  updateSecurityPolicy,
} from '../services/security-policy-service'
import type { SecurityPolicy, SecurityPolicyDetail } from '../types/security-policy'

interface SaveOutcome {
  ok: boolean
  message?: string
}

interface SecurityPolicyState {
  policy: SecurityPolicyDetail | null
  loading: boolean
  /**
   * False until the first fetch settles. The form must not populate from defaults and
   * then jump to the saved values — it renders a skeleton until this flips.
   */
  initialized: boolean
  saving: boolean
  error: string | null
  fetchPolicy: () => Promise<void>
  savePolicy: (policy: SecurityPolicy) => Promise<SaveOutcome>
}

export const useSecurityPolicyStore = create<SecurityPolicyState>((set) => ({
  policy: null,
  loading: false,
  initialized: false,
  saving: false,
  error: null,

  fetchPolicy: async () => {
    set({ loading: true, error: null })
    const result = await getSecurityPolicy()

    set({
      policy: result.policy ?? null,
      loading: false,
      initialized: true,
      error: result.success ? null : (result.message ?? 'Failed to load the security policy'),
    })
  },

  savePolicy: async (policy) => {
    set({ saving: true })
    const result = await updateSecurityPolicy(policy)

    if (!result.success) {
      set({ saving: false })
      return { ok: false, message: result.message }
    }

    // Keep the saved copy: it carries the new `updated_at`, which the form's footer
    // shows, and a refetch would only ask for what the response already returned.
    set({ policy: result.policy ?? null, saving: false, error: null })
    return { ok: true }
  },
}))
