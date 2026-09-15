import toast from 'react-hot-toast'
import { create } from 'zustand'
import { SESSION_ENDED_EVENT } from '../constants/session'
import type { AuthUser, PortalRole } from '../types/portal-roles'
import type { LoginPayload } from '../types/auth'
import type { PermissionKey } from '../types/access-control'
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
  /**
   * Re-reads the session quietly — no loading flag, no redirect — and swaps the user
   * in only when something changed. This is how an admin's Access Control edit
   * reaches an already-open portal without a sign-out.
   */
  refreshPermissions: () => Promise<void>
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

  refreshPermissions: async () => {
    const current = useAuthStore.getState().user
    if (!current) return

    const res = await getSession()
    // A revoked token is already handled by the SESSION_ENDED_EVENT listener below; a
    // network blip is not a reason to change anything on screen.
    if (!res.success || !res.data) return

    const next = res.data
    if (samePermissions(current.permissions, next.permissions) && current.role === next.role) {
      return
    }

    set({ user: { ...current, role: next.role, permissions: next.permissions } })
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

/**
 * The API client fires this when the server stops honouring the token — the account
 * was restricted, the device was signed out from Active Sessions, or the session
 * expired. Storage is already cleared by then; dropping `user` is what makes
 * `ProtectedPortal` redirect to the login page. No logout call: the session is gone.
 */
window.addEventListener(SESSION_ENDED_EVENT, (event) => {
  if (!useAuthStore.getState().user) return

  useProfileStore.getState().reset()
  useAuthStore.setState({ user: null, error: null })

  const message = (event as CustomEvent<{ message?: string }>).detail?.message
  toast.error(message ?? 'Your session has ended — please sign in again', {
    id: SESSION_ENDED_EVENT,
  })
})

function samePermissions(a: PermissionKey[], b: PermissionKey[]): boolean {
  if (a.length !== b.length) return false
  const held = new Set(a)
  return b.every((permission) => held.has(permission))
}

export function usePortalRole(): PortalRole | null {
  return useAuthStore((s) => s.user?.role ?? null)
}

/** Whether the signed-in account currently holds a right. Unauthenticated → false. */
export function usePermission(permission: PermissionKey | undefined): boolean {
  return useAuthStore((s) =>
    !permission ? true : (s.user?.permissions.includes(permission) ?? false),
  )
}

export function isCoordinatorRole(role: PortalRole | null): boolean {
  return role === 'coordinator'
}
