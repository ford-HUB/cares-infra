import { create } from 'zustand'
import { getPortalForRole } from '../config/auth-redirect'
import type { AuthUser, PortalKind, StaffRole } from '../types/staff-roles'
import type { LoginPayload } from '../types/auth'
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
  portal: PortalKind | null
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
  portal: null,
  error: null,

  login: async (payload) => {
    set({ loading: true, error: null })
    const res = await login(payload)
    if (res.success && res.data) {
      const portal = getPortalForRole(res.data.role)
      set({ user: res.data, portal, loading: false, initialized: true, error: null })
      return res.data
    }
    set({ loading: false, error: res.message ?? 'Sign in failed' })
    return null
  },

  checkAuth: async () => {
    set({ loading: true })
    const res = await getSession()
    if (res.success && res.data) {
      const portal = getPortalForRole(res.data.role)
      set({ user: res.data, portal, loading: false, initialized: true, error: null })
      return true
    }
    set({ user: null, portal: null, loading: false, initialized: true, error: null })
    return false
  },

  logout: async () => {
    await logoutSession()
    set({ user: null, portal: null, error: null })
  },

  clearError: () => set({ error: null }),
}))

export function useStaffRole(): StaffRole | null {
  return useAuthStore((s) => s.user?.role ?? null)
}

export function isCoordinatorRole(role: StaffRole | null): boolean {
  return role === 'coordinator' || role === 'assistant_coordinator'
}
