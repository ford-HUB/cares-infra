import { create } from 'zustand'
import {
  advanceDonationStatus,
  fetchInternalDonations,
  type DonationStatusChange,
} from '../services/internal-donation-service'
import type { InternalDonation } from '../types/internal-donation'

interface InternalDonationState {
  donations: InternalDonation[]
  loading: boolean
  /** False until the first fetch settles, so the tiles don't flash zeroes. */
  initialized: boolean
  error: string | null
  fetchDonations: () => Promise<void>
  /** Resolves with the donor address that was notified, for the caller's toast. */
  advance: (id: string, change: DonationStatusChange) => Promise<string>
}

export const useInternalDonationStore = create<InternalDonationState>((set) => ({
  donations: [],
  loading: false,
  initialized: false,
  error: null,

  fetchDonations: async () => {
    set({ loading: true, error: null })
    try {
      const donations = await fetchInternalDonations()
      set({ donations, loading: false, initialized: true })
    } catch {
      set({
        loading: false,
        initialized: true,
        error: 'Donations could not be loaded',
      })
    }
  },

  advance: async (id, change) => {
    const result = await advanceDonationStatus(id, change)
    set({ donations: result.donations })
    return result.notifiedEmail
  },
}))
