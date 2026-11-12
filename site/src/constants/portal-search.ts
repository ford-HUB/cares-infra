/** Most matches listed for a typed query; an empty query lists every screen instead. */
export const PORTAL_SEARCH_MAX_RESULTS = 12

/** Ctrl+K (⌘K on a Mac) focuses the header search from anywhere in the portal. */
export const PORTAL_SEARCH_SHORTCUT_KEY = 'k'

export const PORTAL_SEARCH_PLACEHOLDER = 'Search people, events, modules…'

/**
 * Typing this many characters is what first loads the record lists (users, events,
 * attendees, …) for searching — one request per module, once per session.
 */
export const PORTAL_RECORD_SEARCH_MIN_CHARS = 2

export const PORTAL_SEARCH_GROUP_LABELS = {
  record: 'People & records',
  page: 'Modules & pages',
  setting: 'Settings',
  action: 'Actions',
} as const

/**
 * Tie-break order for result groups. Groups are otherwise ranked by their best
 * match, so "bea" leads with the person and "event" with the module.
 */
export const PORTAL_SEARCH_GROUP_ORDER = ['page', 'record', 'setting', 'action'] as const

/**
 * How much each kind of hit counts. A word in the label outranks the module it sits
 * in, which outranks a synonym, which outranks a passing mention in the description.
 */
export const PORTAL_SEARCH_WEIGHTS = {
  labelExact: 120,
  labelPrefix: 70,
  labelWordPrefix: 45,
  labelSubstring: 25,
  trailWordPrefix: 20,
  keywordPrefix: 18,
  descriptionWordPrefix: 8,
} as const

/** Key under router location state that carries a search into a module. */
export const PORTAL_FIND_STATE_KEY = 'portalFind'

/** Name of the CSS custom highlight that paints the found text (see index.css). */
export const PORTAL_FIND_HIGHLIGHT_NAME = 'portal-find'

/** Most ranges painted on one screen — a cap so a one-letter term can't stall paint. */
export const PORTAL_FIND_MAX_MATCHES = 500

/**
 * How long a module may take to load before "not on this page" is shown. Until then
 * the chip says it is still looking, so a slow table doesn't read as a miss.
 */
export const PORTAL_FIND_SETTLE_MS = 1500

export function portalSearchShortcutLabel(): string {
  const isMac = typeof navigator !== 'undefined' && /mac|iphone|ipad/i.test(navigator.platform)
  return isMac ? '⌘ K' : 'Ctrl K'
}
