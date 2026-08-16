import { create } from 'zustand'
import type { AuthUser, PortalRole } from '../types/portal-roles'
import type { LoginPayload } from '../types/auth'
import { useProfileStore } from './profile-store'
import {
  getSession,
  login,
  logoutSession,
} from '../services/auth-service'

interface AuthState {
  user: AuthUser | null
  loading: boolean
  /** True once the first checkAuth() has resolved; gates route redirects on reload. */
  initialized: boolean
  error: string | null
  login: (payload: LoginPayload) => Promise<AuthUser | null>
  checkAuth: () => Promise<boolean>
  logout: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,
  initialized: false,
  error: null,

  login: async (payload) => {
    set({ loading: true, error: null })
    const res = await login(payload)
    if (res.success && res.data) {
      // Covers a sign-in that didn't pass through logout() — an expired session, or a
      // second account signed in on the same tab.
      useProfileStore.getState().reset()
      set({ user: res.data, loading: false, initialized: true, error: null })
      return res.data
    }
    set({ loading: false, error: res.message ?? 'Sign in failed' })
    return null
  },

  checkAuth: async () => {
    set({ loading: true })
    const res = await getSession()
    if (res.success && res.data) {
      set({ user: res.data, loading: false, initialized: true, error: null })
      return true
    }
    set({ user: null, loading: false, initialized: true, error: null })
    return false
  },

  logout: async () => {
    await logoutSession()
    // The profile store caches for the whole session now, so it has to be dropped
    // here — otherwise the next sign-in on this tab starts with the old user's data.
    useProfileStore.getState().reset()
    set({ user: null, error: null })
  },

  clearError: () => set({ error: null }),
}))

export function usePortalRole(): PortalRole | null {
  return useAuthStore((s) => s.user?.role ?? null)
}

export function isCoordinatorRole(role: PortalRole | null): boolean {
  return role === 'coordinator'
}
