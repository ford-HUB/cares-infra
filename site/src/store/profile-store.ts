import { create } from 'zustand'
import {
  getCurrentDirectorProfile,
  getCurrentStaffProfile,
  updatePortalProfile,
  type UpdatePortalProfilePayload,
} from '../services/profile-service'
import type { ProfileInfo } from '../types/profile'

interface ProfileState {
  profile: ProfileInfo | null
  loading: boolean
  saving: boolean
  fetchStaffProfile: () => Promise<void>
  fetchDirectorProfile: () => Promise<void>
  fetchPortalProfile: (portal: 'director' | 'staff') => Promise<void>
  savePortalProfile: (payload: UpdatePortalProfilePayload) => Promise<boolean>
}

export const useProfileStore = create<ProfileState>((set) => ({
  profile: null,
  loading: false,
  saving: false,

  fetchStaffProfile: async () => {
    set({ loading: true })
    const res = await getCurrentStaffProfile()
    set({ profile: res.data ?? null, loading: false })
  },

  fetchDirectorProfile: async () => {
    set({ loading: true })
    const res = await getCurrentDirectorProfile()
    set({ profile: res.data ?? null, loading: false })
  },

  fetchPortalProfile: async (portal) => {
    if (portal === 'director') {
      await useProfileStore.getState().fetchDirectorProfile()
      return
    }
    await useProfileStore.getState().fetchStaffProfile()
  },

  savePortalProfile: async (payload) => {
    set({ saving: true })
    const res = await updatePortalProfile(payload)
    set({
      profile: res.data ?? null,
      saving: false,
    })
    return res.success
  },
}))
