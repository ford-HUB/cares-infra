export const PORTAL_SEARCH_MAX_RESULTS = 12

export const PORTAL_SEARCH_SHORTCUT_KEY = 'k'

export const PORTAL_SEARCH_PLACEHOLDER = 'Search people, events, modules…'

/** Record lists load once per session, after this many characters. */
export const PORTAL_RECORD_SEARCH_MIN_CHARS = 2

export const PORTAL_SEARCH_GROUP_LABELS = {
  record: 'People & records',
  page: 'Modules & pages',
  setting: 'Settings',
  action: 'Actions',
} as const

/** Tie-break only; groups rank by best match first. */
export const PORTAL_SEARCH_GROUP_ORDER = ['page', 'record', 'setting', 'action'] as const

export const PORTAL_SEARCH_WEIGHTS = {
  labelExact: 120,
  labelPrefix: 70,
  labelWordPrefix: 45,
  labelSubstring: 25,
  trailWordPrefix: 20,
  keywordPrefix: 18,
  descriptionWordPrefix: 8,
} as const

export const PORTAL_FIND_STATE_KEY = 'portalFind'

/** CSS custom highlight; see index.css. */
export const PORTAL_FIND_HIGHLIGHT_NAME = 'portal-find'

/** Caps painted ranges so a one-letter term can't stall paint. */
export const PORTAL_FIND_MAX_MATCHES = 500

/** Grace period so a slow table doesn't read as a miss. */
export const PORTAL_FIND_SETTLE_MS = 1500

export function portalSearchShortcutLabel(): string {
  const isMac = typeof navigator !== 'undefined' && /mac|iphone|ipad/i.test(navigator.platform)
  return isMac ? '⌘ K' : 'Ctrl K'
}
