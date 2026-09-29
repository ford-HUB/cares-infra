import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { PERMISSION_SYNC_INTERVAL_MS } from '../constants/portal-permissions'
import { useAuthStore } from '../store/auth-store'

/**
 * Keeps the session's rights current while the portal is open. The server is the
 * only place a right can change (an admin in Access Control), so the portal re-reads
 * on every navigation, whenever the tab comes back into view, and on a timer for the
 * case where the person just sits on one screen. Each read is one small request and
 * only touches state when something actually moved.
 */
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
