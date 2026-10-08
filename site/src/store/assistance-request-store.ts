import { create } from 'zustand'
import {
  decideAssistanceRequest,
  fetchAssistanceRequests,
} from '../services/assistance-request-service'
import type { AssistanceDecision, AssistanceRequest } from '../types/assistance-request'

interface AssistanceRequestState {
  requests: AssistanceRequest[]
  loading: boolean
  /** False until the first fetch settles, so the empty state can't flash on mount. */
  initialized: boolean
  error: string | null
  fetchRequests: () => Promise<void>
  decide: (id: string, decision: AssistanceDecision, note?: string) => Promise<void>
}

export const useAssistanceRequestStore = create<AssistanceRequestState>((set) => ({
  requests: [],
  loading: false,
  initialized: false,
  error: null,

  fetchRequests: async () => {
    set({ loading: true, error: null })
    try {
      const requests = await fetchAssistanceRequests()
      set({ requests, loading: false, initialized: true })
    } catch (error) {
      set({
        loading: false,
        initialized: true,
        error: error instanceof Error ? error.message : 'Assistance requests could not be loaded',
      })
    }
  },

  decide: async (id, decision, note) => {
    const updated = await decideAssistanceRequest(id, decision, note)
    set((state) => ({
      requests: state.requests.map((request) => (request.id === updated.id ? updated : request)),
    }))
  },
}))
