import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/auth-store'
import type { PortalNavConfig } from '../types/nav'
import { trackPageLoad } from '../utils/page-load-tracker'

/** Signed-in only: the report needs the session token. */
export function usePageLoadReporter(nav: PortalNavConfig): void {
  const signedIn = useAuthStore((s) => s.user !== null)
  const { pathname } = useLocation()

  useEffect(() => {
    if (!signedIn) return
    trackPageLoad(pathname, nav)
  }, [pathname, nav, signedIn])
}
