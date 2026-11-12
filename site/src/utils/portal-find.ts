import { PORTAL_FIND_MAX_MATCHES, PORTAL_FIND_STATE_KEY } from '../constants/portal-search'
import type { PortalFindState } from '../types/portal-search'

/** The search carried into this screen, if the header search opened it. */
export function readPortalFind(state: unknown): PortalFindState | null {
  if (!state || typeof state !== 'object') return null
  const find = (state as Record<string, unknown>)[PORTAL_FIND_STATE_KEY]
  if (!find || typeof find !== 'object') return null
  const { term, nonce, dismissed } = find as Record<string, unknown>
  if (typeof term !== 'string' || typeof nonce !== 'number') return null
  return { term, nonce, dismissed: dismissed === true }
}

export function portalFindState(find: PortalFindState): Record<string, PortalFindState> {
  return { [PORTAL_FIND_STATE_KEY]: find }
}

/** CSS Custom Highlight API — paints ranges without touching the DOM React owns. */
export function supportsTextHighlights(): boolean {
  return typeof CSS !== 'undefined' && 'highlights' in CSS && typeof Highlight !== 'undefined'
}

// Text the viewer is typing in, or that is never shown, is not a match.
const SKIPPED_PARENTS = new Set(['INPUT', 'TEXTAREA', 'SELECT', 'OPTION', 'SCRIPT', 'STYLE', 'NOSCRIPT'])

/**
 * Every case-insensitive occurrence of `term` in the visible text under `root`, as
 * DOM ranges — only the matched characters, never the whole cell.
 */
export function findTextRanges(root: Element, term: string): Range[] {
  const needle = term.trim().toLowerCase()
  if (!needle) return []

  const ranges: Range[] = []
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      const parent = node.parentElement
      if (!parent || SKIPPED_PARENTS.has(parent.tagName)) return NodeFilter.FILTER_REJECT
      if (parent.closest('[aria-hidden="true"]')) return NodeFilter.FILTER_REJECT
      return node.nodeValue && node.nodeValue.length >= needle.length
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT
    },
  })

  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = (node.nodeValue ?? '').toLowerCase()
    for (let at = text.indexOf(needle); at !== -1; at = text.indexOf(needle, at + needle.length)) {
      const range = document.createRange()
      range.setStart(node, at)
      range.setEnd(node, at + needle.length)
      ranges.push(range)
      if (ranges.length >= PORTAL_FIND_MAX_MATCHES) return ranges
    }
  }
  return ranges
}
