import {
  PORTAL_SEARCH_EXTRA_ENTRIES,
  PORTAL_SEARCH_ROUTE_META,
} from '../config/portal-search'
import { PORTAL_SEARCH_MAX_RESULTS, PORTAL_SEARCH_WEIGHTS as W } from '../constants/portal-search'
import type { PermissionKey } from '../types/access-control'
import { navGateAllows, type PortalNavConfig } from '../types/nav'
import type { PortalRole } from '../types/portal-roles'
import type { PortalSearchEntry } from '../types/portal-search'

/**
 * Every screen this account may open, flattened from the sidebar config plus the
 * screens that live inside modules. It runs the sidebar's own gate, so search never
 * offers a module the sidebar hides (a suspended right is left out too — the
 * sidebar shows it locked, but there is nothing to open).
 */
export function buildPortalSearchIndex(
  nav: PortalNavConfig,
  role: PortalRole | undefined,
  permissions: ReadonlySet<PermissionKey>,
): PortalSearchEntry[] {
  const entries: PortalSearchEntry[] = []
  const seen = new Set<string>()

  const add = (entry: PortalSearchEntry) => {
    if (entry.to && seen.has(entry.to)) return
    if (entry.to) seen.add(entry.to)
    entries.push(entry)
  }

  for (const item of nav.items) {
    // Section headings ("Menu", "Support") are sidebar layout, not a place.
    if (item.type === 'section') continue
    if (!navGateAllows(item, role, permissions)) continue

    if (item.type === 'link') {
      const meta = PORTAL_SEARCH_ROUTE_META[item.to]
      add({
        id: `page:${item.to}`,
        kind: 'page',
        label: item.label,
        description: meta?.description,
        keywords: meta?.keywords ?? [],
        icon: item.icon,
        to: item.to,
      })
      continue
    }

    for (const child of item.children) {
      if (!navGateAllows(child, role, permissions)) continue
      const meta = PORTAL_SEARCH_ROUTE_META[child.to]
      add({
        id: `page:${child.to}`,
        kind: 'page',
        label: child.label,
        trail: item.label,
        description: meta?.description,
        // The group's own name is a keyword, so "event" finds Map and Calendar too.
        keywords: [item.label, ...(meta?.keywords ?? [])],
        icon: item.icon,
        to: child.to,
      })
    }
  }

  for (const extra of PORTAL_SEARCH_EXTRA_ENTRIES) {
    if (!navGateAllows(extra, role, permissions)) continue
    add({
      id: `${extra.kind}:${extra.to}`,
      kind: extra.kind,
      label: extra.label,
      trail: extra.trail,
      description: extra.description,
      keywords: extra.keywords,
      icon: extra.icon,
      to: extra.to,
    })
  }

  return entries
}

export function normalizeSearchText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

export function searchTokens(query: string): string[] {
  const normalized = normalizeSearchText(query)
  return normalized ? normalized.split(' ') : []
}

const hasWordStartingWith = (text: string, token: string) =>
  text.startsWith(token) || text.includes(` ${token}`)

interface NormalizedEntry {
  label: string
  trail: string
  keywords: string[]
  description: string
}

// Records are rebuilt only when a store changes, so normalising each one once (not
// once per keystroke) keeps a few thousand users cheap to search.
const normalizedCache = new WeakMap<PortalSearchEntry, NormalizedEntry>()

function normalized(entry: PortalSearchEntry): NormalizedEntry {
  let n = normalizedCache.get(entry)
  if (!n) {
    n = {
      label: normalizeSearchText(entry.label),
      trail: normalizeSearchText(entry.trail ?? ''),
      keywords: entry.keywords.map(normalizeSearchText),
      description: normalizeSearchText(entry.description ?? ''),
    }
    normalizedCache.set(entry, n)
  }
  return n
}

/** Best score one query token earns against an entry, or 0 when it matches nothing. */
function scoreToken(n: NormalizedEntry, token: string, fullQuery: string): number {
  if (n.label === fullQuery) return W.labelExact
  if (n.label.startsWith(token)) return W.labelPrefix
  if (hasWordStartingWith(n.label, token)) return W.labelWordPrefix
  if (token.length >= 3 && n.label.includes(token)) return W.labelSubstring
  if (hasWordStartingWith(n.trail, token)) return W.trailWordPrefix
  if (n.keywords.some((k) => hasWordStartingWith(k, token))) return W.keywordPrefix
  if (hasWordStartingWith(n.description, token)) return W.descriptionWordPrefix
  return 0
}

export interface RankedEntry {
  entry: PortalSearchEntry
  score: number
}

/**
 * Every token of the query must land somewhere (label, module, synonym or
 * description); entries are ranked by the sum of their best hits, label first.
 * An empty query lists every screen and action — but no records, which would bury
 * the modules under the whole user list.
 */
export function rankPortalEntries(
  entries: PortalSearchEntry[],
  query: string,
  limit = PORTAL_SEARCH_MAX_RESULTS,
): RankedEntry[] {
  const tokens = searchTokens(query)
  if (tokens.length === 0) {
    return entries.filter((e) => e.kind !== 'record').map((entry) => ({ entry, score: 0 }))
  }
  const fullQuery = tokens.join(' ')

  const scored: RankedEntry[] = []
  for (const entry of entries) {
    const n = normalized(entry)
    let total = 0
    for (const token of tokens) {
      const score = scoreToken(n, token, fullQuery)
      if (score === 0) {
        total = 0
        break
      }
      total += score
    }
    if (total > 0) scored.push({ entry, score: total })
  }

  return scored
    .sort((a, b) => b.score - a.score || a.entry.label.localeCompare(b.entry.label))
    .slice(0, limit)
}

export function searchPortalIndex(
  entries: PortalSearchEntry[],
  query: string,
  limit = PORTAL_SEARCH_MAX_RESULTS,
): PortalSearchEntry[] {
  return rankPortalEntries(entries, query, limit).map((r) => r.entry)
}

/** [start, end) ranges of `label` that a query token matched, for highlighting. */
export function matchedRanges(label: string, query: string): [number, number][] {
  const lower = label.toLowerCase()
  const ranges: [number, number][] = []
  for (const token of searchTokens(query)) {
    const at = lower.indexOf(token)
    if (at >= 0) ranges.push([at, at + token.length])
  }
  ranges.sort((a, b) => a[0] - b[0])
  const merged: [number, number][] = []
  for (const r of ranges) {
    const last = merged[merged.length - 1]
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1])
    else merged.push([...r])
  }
  return merged
}
