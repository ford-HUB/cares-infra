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

/**
 * The theme actually on screen. `system` follows the OS live — switching the
 * computer to dark while the portal is open flips the portal too.
 */
export function useResolvedTheme(): ResolvedPortalTheme {
  const theme = useThemeStore((s) => s.theme)
  const prefersDark = useSyncExternalStore(subscribeToSystemTheme, systemPrefersDark, () => false)
  if (theme === 'system') return prefersDark ? 'dark' : 'light'
  return theme
}

/**
 * Applies the theme to <html> for as long as the portal shell is mounted.
 * It sits on <html> (not the shell's own div) so dialogs, dropdowns and toasts that
 * portal into <body> are themed as well; and it is removed on unmount so signing
 * out lands on the public site in its normal light palette.
 */
export function usePortalTheme() {
  const resolved = useResolvedTheme()

  // Layout effect: set before paint so a dark-mode reload doesn't flash light.
  useLayoutEffect(() => {
    const root = document.documentElement
    root.classList.toggle(PORTAL_DARK_CLASS, resolved === 'dark')
    return () => root.classList.remove(PORTAL_DARK_CLASS)
  }, [resolved])
}
