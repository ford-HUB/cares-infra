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
  /**
   * False until the first fetch settles, so the mount render — `loading` still false,
   * `profile` still null — renders the skeleton instead of an empty profile.
   */
  initialized: boolean
  saving: boolean
  /** Always refetches. Use when the profile is known to have changed server-side. */
  fetchProfile: () => Promise<void>
  /**
   * Fetches only on the first call of a session. The portal shell and the profile
   * page both need the profile on mount; without this they each fire their own
   * request on every route change.
   */
  ensureProfile: () => Promise<void>
  savePortalProfile: (payload: UpdatePortalProfilePayload) => Promise<boolean>
  /** Called on sign-out — the next user must not inherit this profile. */
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
    // A failed save leaves the loaded profile in place — nulling it here would blank
    // the header avatar and re-trigger the skeleton on a request that changed nothing.
    set((state) => ({
      profile: res.success && res.data ? res.data : state.profile,
      saving: false,
    }))
    return res.success
  },

  reset: () => set({ profile: null, loading: false, initialized: false, saving: false }),
}))
