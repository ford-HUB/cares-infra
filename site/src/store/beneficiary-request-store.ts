import { create } from 'zustand'
import {
  acceptBeneficiaryRequest,
  deleteBeneficiaryRequest,
  fetchBeneficiaryRequests,
  restoreBeneficiaryRequest,
} from '../services/beneficiary-request-service'
import type { BeneficiaryRequest } from '../types/beneficiary-request'

interface BeneficiaryRequestState {
  requests: BeneficiaryRequest[]
  loading: boolean
  /** False until the first fetch settles, so the empty state can't flash on mount. */
  initialized: boolean
  error: string | null
  fetchRequests: () => Promise<void>
  accept: (id: string, actor: string) => Promise<void>
  remove: (id: string, actor: string) => Promise<void>
  restore: (id: string, actor: string) => Promise<void>
}

export const useBeneficiaryRequestStore = create<BeneficiaryRequestState>((set) => ({
  requests: [],
  loading: false,
  initialized: false,
  error: null,

  fetchRequests: async () => {
    set({ loading: true, error: null })
    try {
      const requests = await fetchBeneficiaryRequests()
      set({ requests, loading: false, initialized: true })
    } catch {
      set({
        loading: false,
        initialized: true,
        error: 'Beneficiary requests could not be loaded',
      })
    }
  },

  accept: async (id, actor) => {
    set({ requests: await acceptBeneficiaryRequest({ id, actor }) })
  },

  remove: async (id, actor) => {
    set({ requests: await deleteBeneficiaryRequest({ id, actor }) })
  },

  restore: async (id, actor) => {
    set({ requests: await restoreBeneficiaryRequest({ id, actor }) })
  },
}))
