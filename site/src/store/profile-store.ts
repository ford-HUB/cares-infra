import { create } from 'zustand'
import {
  getCurrentPortalProfile,
  updatePortalProfile,
  type UpdatePortalProfilePayload,
} from '../services/profile-service'
import type { ProfileInfo } from '../types/profile'

interface ProfileState {
  profile: ProfileInfo | null
  loading: boolean
  initialized: boolean
  saving: boolean
  fetchProfile: () => Promise<void>
  /** Shell and profile page both need it on mount; avoids duplicate requests per route. */
  ensureProfile: () => Promise<void>
  savePortalProfile: (payload: UpdatePortalProfilePayload) => Promise<boolean>
  reset: () => void
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profile: null,
  loading: false,
  initialized: false,
  saving: false,

  fetchProfile: async () => {
    set({ loading: true })
    const res = await getCurrentPortalProfile()
    set({ profile: res.data ?? null, loading: false, initialized: true })
  },

  ensureProfile: async () => {
    const { initialized, loading } = get()
    if (initialized || loading) {
      return
    }
    await get().fetchProfile()
  },

  savePortalProfile: async (payload) => {
    set({ saving: true })
    const res = await updatePortalProfile(payload)
    // Keep the loaded profile; nulling it would blank the avatar and re-trigger the skeleton.
    set((state) => ({
      profile: res.success && res.data ? res.data : state.profile,
      saving: false,
    }))
    return res.success
  },

  reset: () => set({ profile: null, loading: false, initialized: false, saving: false }),
}))
