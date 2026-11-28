import { useCallback, useEffect, useState } from 'react'
import type { RefObject } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { PORTAL_FIND_HIGHLIGHT_NAME, PORTAL_FIND_SETTLE_MS } from '../constants/portal-search'
import {
  findTextRanges,
  portalFindState,
  readPortalFind,
  supportsTextHighlights,
} from '../utils/portal-find'

export type PortalFindStatus = 'searching' | 'found' | 'missing'

/** CSS Custom Highlight API, so React's DOM is untouched; a MutationObserver repaints as rows render. */
export function usePortalFindHighlight(containerRef: RefObject<HTMLElement | null>) {
  const location = useLocation()
  const navigate = useNavigate()
  const find = readPortalFind(location.state)
  const term = find && !find.dismissed ? find.term.trim() : ''
  const nonce = find?.nonce ?? 0

  const [result, setResult] = useState({ nonce: 0, count: 0, settled: false })

  useEffect(() => {
    const root = containerRef.current
    if (!term || !root || !supportsTextHighlights()) return

    let frame = 0
    let scrolled = false
    let settled = false
    let count = 0
    const publish = () => setResult({ nonce, count, settled })

    const paint = () => {
      frame = 0
      const ranges = findTextRanges(root, term)
      CSS.highlights.set(PORTAL_FIND_HIGHLIGHT_NAME, new Highlight(...ranges))
      count = ranges.length
      if (!scrolled && ranges[0]) {
        scrolled = true
        ranges[0].startContainer.parentElement?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      }
      publish()
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(paint)
    }

    schedule()
    const observer = new MutationObserver(schedule)
    observer.observe(root, { childList: true, subtree: true, characterData: true })
    const settleTimer = window.setTimeout(() => {
      settled = true
      publish()
    }, PORTAL_FIND_SETTLE_MS)

    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
      window.clearTimeout(settleTimer)
      CSS.highlights.delete(PORTAL_FIND_HIGHLIGHT_NAME)
    }
  }, [containerRef, term, nonce])

  const dismiss = useCallback(() => {
    if (!find) return
    navigate(
      { pathname: location.pathname, search: location.search, hash: location.hash },
      { replace: true, state: portalFindState({ ...find, dismissed: true }) },
    )
  }, [find, navigate, location.pathname, location.search, location.hash])

  // Ignore results from an earlier search nonce.
  const current = result.nonce === nonce ? result : { count: 0, settled: false }
  const status: PortalFindStatus =
    current.count > 0 ? 'found' : current.settled ? 'missing' : 'searching'

  return {
    term,
    active: term !== '' && supportsTextHighlights(),
    count: current.count,
    status,
    dismiss,
  }
}
