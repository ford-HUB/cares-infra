import { useCallback } from 'react'
import { flushSync } from 'react-dom'
import {
  MODE_TOGGLE_SELECTOR,
  PREFERS_DARK_QUERY,
  THEME_SWITCHING_CLASS,
  THEME_TRANSITION_EASING,
  THEME_TRANSITION_MS,
  type PortalTheme,
} from '../constants/portal-theme'
import { useThemeStore } from '../store/theme-store'
import { useResolvedTheme } from './use-portal-theme'

const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Centre of `origin`, else of the header toggle, else the top-right corner. */
function revealOrigin(origin?: Element | null): { x: number; y: number } {
  const el = origin ?? document.querySelector(MODE_TOGGLE_SELECTOR)
  if (el) {
    const r = el.getBoundingClientRect()
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
  }
  return { x: window.innerWidth, y: 0 }
}

/**
 * Switches the theme with the circular reveal: the browser snapshots the page, the
 * theme flips underneath (flushSync, so the `dark` class lands inside the
 * snapshot callback), and the new palette grows out of the toggle until it covers
 * the screen. Browsers without View Transitions, and viewers who ask for reduced
 * motion, get an instant switch. Choosing an option that looks the same (System
 * while the OS is already dark, say) just records the choice.
 */
export function useThemeSwitch() {
  const current = useResolvedTheme()
  const setTheme = useThemeStore((s) => s.setTheme)

  return useCallback(
    (next: PortalTheme, origin?: Element | null) => {
      const nextResolved =
        next === 'system'
          ? window.matchMedia(PREFERS_DARK_QUERY).matches
            ? 'dark'
            : 'light'
          : next
      const root = document.documentElement
      const apply = () => flushSync(() => setTheme(next))

      if (nextResolved === current) {
        setTheme(next)
        return
      }

      if (!document.startViewTransition || prefersReducedMotion()) {
        // Still pause transitions for the frame, so nothing smears between palettes.
        root.classList.add(THEME_SWITCHING_CLASS)
        apply()
        requestAnimationFrame(() => root.classList.remove(THEME_SWITCHING_CLASS))
        return
      }

      const { x, y } = revealOrigin(origin)
      const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))

      root.classList.add(THEME_SWITCHING_CLASS)
      const transition = document.startViewTransition(apply)
      transition.ready
        .then(() => {
          root.animate(
            { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
            {
              duration: THEME_TRANSITION_MS,
              easing: THEME_TRANSITION_EASING,
              pseudoElement: '::view-transition-new(root)',
            },
          )
        })
        .catch(() => {
          // Skipped (e.g. a second click mid-reveal) — the theme is already applied.
        })
      void transition.finished.finally(() => root.classList.remove(THEME_SWITCHING_CLASS))
    },
    [current, setTheme],
  )
}
