import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/auth-store'
import type { PortalNavConfig } from '../types/nav'
import { trackPageLoad } from '../utils/page-load-tracker'

/**
 * Times every screen this tab opens and reports it to the server, where the
 * Performance page reads the medians. Only while signed in — the report needs the
 * session's token, and the login screen is not a portal screen.
 */
export function usePageLoadReporter(nav: PortalNavConfig): void {
  const signedIn = useAuthStore((s) => s.user !== null)
  const { pathname } = useLocation()

  useEffect(() => {
    if (!signedIn) return
    trackPageLoad(pathname, nav)
  }, [pathname, nav, signedIn])
}
