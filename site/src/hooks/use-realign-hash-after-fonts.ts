import { useEffect } from 'react'

const VISITOR_SCROLL_EVENTS = ['wheel', 'touchstart', 'keydown'] as const

/** Font swap shortens the page, so re-aim the hash scroll once fonts load. */
export function useRealignHashAfterFonts() {
  useEffect(() => {
    const sectionId = decodeURIComponent(window.location.hash.slice(1))
    const [entry] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[]
    // Don't override a restored position on reload or Back.
    if (!sectionId || entry?.type !== 'navigate' || document.fonts.status === 'loaded') return

    let cancelled = false
    const cancel = () => {
      cancelled = true
    }
    for (const event of VISITOR_SCROLL_EVENTS) {
      window.addEventListener(event, cancel, { passive: true })
    }

    void document.fonts.ready.then(() => {
      if (!cancelled) document.getElementById(sectionId)?.scrollIntoView()
    })

    return () => {
      cancel()
      for (const event of VISITOR_SCROLL_EVENTS) window.removeEventListener(event, cancel)
    }
  }, [])
}
