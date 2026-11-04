import { useLayoutEffect } from 'react'
import { LANDING_ZOOM } from '../constants/landing-bulletin'

function zoomForWidth(width: number) {
  const scale = width / LANDING_ZOOM.baseWidthPx
  return Math.min(Math.max(scale, 1), LANDING_ZOOM.max)
}

/** Publishes the landing page's desktop zoom as `--landing-zoom` on <html>; the stylesheet
 *  applies it while the landing page is mounted. Viewport units are scaled by CSS zoom, so
 *  full-height blocks divide by the same variable. Runs before paint to avoid a jump. */
export function useLandingZoom() {
  useLayoutEffect(() => {
    const root = document.documentElement
    const update = () =>
      root.style.setProperty(LANDING_ZOOM.cssVar, String(zoomForWidth(window.innerWidth)))

    update()
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('resize', update)
      root.style.removeProperty(LANDING_ZOOM.cssVar)
    }
  }, [])
}
