import toast from 'react-hot-toast'
import { create } from 'zustand'
import { SESSION_ENDED_EVENT } from '../constants/session'
import type { AuthUser, PortalRole } from '../types/portal-roles'
import type { LoginPayload } from '../types/auth'
import type { PermissionKey, SessionSuspension } from '../types/access-control'
import { useProfileStore } from './profile-store'
import { getSession, login, logoutSession } from '../services/auth-service'

interface AuthState {
  user: AuthUser | null
  loading: boolean
  /** Gates route redirects on reload. */
  initialized: boolean
  error: string | null
  login: (payload: LoginPayload) => Promise<AuthUser | null>
  checkAuth: () => Promise<boolean>
  /** Quiet re-read so Access Control edits reach an open portal without sign-out. */
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
      // Covers sign-ins that skipped logout(): expiry, or a second account on this tab.
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
    // Revocation is handled by the SESSION_ENDED_EVENT listener; blips change nothing.
    if (!res.success || !res.data) return

    const next = res.data
    if (
      samePermissions(current.permissions, next.permissions) &&
      sameSuspensions(current.suspensions, next.suspensions) &&
      current.role === next.role
    ) {
      return
    }

    set({
      user: {
        ...current,
        role: next.role,
        permissions: next.permissions,
        suspensions: next.suspensions,
      },
    })
  },

  logout: async () => {
    await logoutSession()
    // Profile store caches per session, so drop it before the next sign-in.
    useProfileStore.getState().reset()
    set({ user: null, error: null })
  },

  clearError: () => set({ error: null }),
}))

/** Storage is already cleared; dropping `user` makes `ProtectedPortal` redirect. No logout call. */
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

function sameSuspensions(a: SessionSuspension[], b: SessionSuspension[]): boolean {
  if (a.length !== b.length) return false
  const key = (entry: SessionSuspension) =>
    `${entry.permission}|${entry.reason}|${entry.issuedAt}|${entry.expiresAt ?? ''}`
  const held = new Set(a.map(key))
  return b.every((entry) => held.has(key(entry)))
}

export function usePortalRole(): PortalRole | null {
  return useAuthStore((s) => s.user?.role ?? null)
}

export function usePermission(permission: PermissionKey | undefined): boolean {
  return useAuthStore((s) =>
    !permission ? true : (s.user?.permissions.includes(permission) ?? false),
  )
}

const NO_SUSPENSIONS: SessionSuspension[] = []

export function useSessionSuspensions(): SessionSuspension[] {
  return useAuthStore((s) => s.user?.suspensions ?? NO_SUSPENSIONS)
}

/** When this returns an entry, show the locked control rather than hiding it. */
export function useSuspension(
  permission: PermissionKey | undefined,
): SessionSuspension | undefined {
  return useAuthStore((s) =>
    permission
      ? s.user?.suspensions.find((entry) => entry.permission === permission)
      : undefined,
  )
}

export function isCoordinatorRole(role: PortalRole | null): boolean {
  return role === 'coordinator'
}
