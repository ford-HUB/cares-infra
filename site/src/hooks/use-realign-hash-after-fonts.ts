import { useEffect } from 'react'

const VISITOR_SCROLL_EVENTS = ['wheel', 'touchstart', 'keydown'] as const

/** A link opened straight to a section starts scrolling before the web fonts arrive. Their
 *  swap rewraps the text above and shortens the page, so the scroll lands short of the
 *  section's top. This aims again once the fonts are in, unless the visitor has taken over. */
export function useRealignHashAfterFonts() {
  useEffect(() => {
    const sectionId = decodeURIComponent(window.location.hash.slice(1))
    const [entry] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[]
    // A reload or Back restores the visitor's own position, which must not be overridden.
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
