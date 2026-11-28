import { useLayoutEffect, useSyncExternalStore } from 'react'
import {
  PORTAL_DARK_CLASS,
  PREFERS_DARK_QUERY,
  type ResolvedPortalTheme,
} from '../constants/portal-theme'
import { useThemeStore } from '../store/theme-store'

function subscribeToSystemTheme(onChange: () => void) {
  const query = window.matchMedia(PREFERS_DARK_QUERY)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

const systemPrefersDark = () => window.matchMedia(PREFERS_DARK_QUERY).matches

export function useResolvedTheme(): ResolvedPortalTheme {
  const theme = useThemeStore((s) => s.theme)
  const prefersDark = useSyncExternalStore(subscribeToSystemTheme, systemPrefersDark, () => false)
  if (theme === 'system') return prefersDark ? 'dark' : 'light'
  return theme
}

/** On <html> so portalled dialogs and toasts are themed; removed on unmount for the public site. */
export function usePortalTheme() {
  const resolved = useResolvedTheme()

  // Before paint so a dark reload doesn't flash light.
  useLayoutEffect(() => {
    const root = document.documentElement
    root.classList.toggle(PORTAL_DARK_CLASS, resolved === 'dark')
    return () => root.classList.remove(PORTAL_DARK_CLASS)
  }, [resolved])
}
