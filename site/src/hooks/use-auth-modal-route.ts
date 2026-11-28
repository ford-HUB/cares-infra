import { useCallback, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AUTH_MODAL_LINK_STATE } from '../constants/auth-modal'
import { HOME_PATH, LOGIN_PATH, REQUEST_ACCESS_PATH } from '../constants/routes'
import type { AuthModalLinkState, AuthModalView } from '../types/auth-modal'

const VIEW_BY_PATH: Record<string, AuthModalView> = {
  [LOGIN_PATH]: 'login',
  [REQUEST_ACCESS_PATH]: 'request-access',
}

const PATH_BY_VIEW: Record<AuthModalView, string> = {
  login: LOGIN_PATH,
  'request-access': REQUEST_ACCESS_PATH,
}

/** URL-driven so /login works for redirects and bookmarks while the landing stays mounted. */
export function useAuthModalRoute() {
  const location = useLocation()
  const navigate = useNavigate()
  const routeView = VIEW_BY_PATH[location.pathname] ?? null

  // Keeps the last form rendered while the card animates out.
  const [view, setView] = useState<AuthModalView>(routeView ?? 'login')
  if (routeView && routeView !== view) setView(routeView)

  const openedFromLanding = Boolean(
    (location.state as AuthModalLinkState | null)?.fromLanding,
  )

  const close = useCallback(() => {
    if (openedFromLanding) {
      navigate(-1)
      return
    }
    navigate(HOME_PATH, { replace: true, preventScrollReset: true })
  }, [navigate, openedFromLanding])

  const switchTo = useCallback(
    (next: AuthModalView) => {
      navigate(PATH_BY_VIEW[next], {
        replace: true,
        preventScrollReset: true,
        state: openedFromLanding ? AUTH_MODAL_LINK_STATE : undefined,
      })
    },
    [navigate, openedFromLanding],
  )

  return { open: routeView !== null, view, close, switchTo }
}
