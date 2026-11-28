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

function revealOrigin(origin?: Element | null): { x: number; y: number } {
  const el = origin ?? document.querySelector(MODE_TOGGLE_SELECTOR)
  if (el) {
    const r = el.getBoundingClientRect()
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
  }
  return { x: window.innerWidth, y: 0 }
}

/** flushSync so the `dark` class lands inside the View Transition snapshot. */
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
          // Skipped (e.g. a second click mid-reveal); theme already applied.
        })
      void transition.finished.finally(() => root.classList.remove(THEME_SWITCHING_CLASS))
    },
    [current, setTheme],
  )
}
