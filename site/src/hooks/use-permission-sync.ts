import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { PERMISSION_SYNC_INTERVAL_MS } from '../constants/portal-permissions'
import { useAuthStore } from '../store/auth-store'

/** Re-reads on navigation, tab focus, and a timer; only updates state on change. */
export function usePermissionSync(): void {
  const refreshPermissions = useAuthStore((s) => s.refreshPermissions)
  const signedIn = useAuthStore((s) => s.user !== null)
  const { pathname } = useLocation()

  useEffect(() => {
    if (!signedIn) return
    void refreshPermissions()
  }, [pathname, refreshPermissions, signedIn])

  useEffect(() => {
    if (!signedIn) return

    const onVisible = () => {
      if (document.visibilityState === 'visible') void refreshPermissions()
    }
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refreshPermissions()
    }, PERMISSION_SYNC_INTERVAL_MS)

    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)

    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  }, [refreshPermissions, signedIn])
}
