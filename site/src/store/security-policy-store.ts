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
  /** Skeleton until loaded so the form doesn't jump from defaults to saved values. */
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

    // The saved copy carries the new `updated_at`; no refetch needed.
    set({ policy: result.policy ?? null, saving: false, error: null })
    return { ok: true }
  },
}))
