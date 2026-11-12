/** What the viewer picked; `system` follows the operating system's appearance. */
export type PortalTheme = 'light' | 'dark' | 'system'

/** What is actually on screen once `system` is resolved. */
export type ResolvedPortalTheme = Exclude<PortalTheme, 'system'>

/** localStorage key for the viewer's portal theme — a per-browser preference. */
export const PORTAL_THEME_STORAGE_KEY = 'cares-portal-theme'

export const DEFAULT_PORTAL_THEME: PortalTheme = 'light'

/** Class on <html> that switches the portal's palette (see styles/portal-dark.css). */
export const PORTAL_DARK_CLASS = 'dark'

/** The OS preference `system` follows. */
export const PREFERS_DARK_QUERY = '(prefers-color-scheme: dark)'

/**
 * The switch animation: the new theme spreads out from the toggle as a growing
 * circle (View Transitions API, the shadcn-ecosystem theme toggler's reveal).
 */
export const THEME_TRANSITION_MS = 500
export const THEME_TRANSITION_EASING = 'ease-in-out'

/**
 * On <html> for the instant of the switch — pauses every other CSS transition
 * (shadcn's `disableTransitionOnChange`) so buttons and borders don't fade between
 * palettes on their own clocks; the reveal is the one animation.
 */
export const THEME_SWITCHING_CLASS = 'theme-switching'

/** The header toggle; the reveal starts from its centre when no origin is given. */
export const MODE_TOGGLE_SELECTOR = '[data-mode-toggle]'

/** Choices in the header's theme menu, in the order shadcn's mode toggle lists them. */
export const PORTAL_THEME_OPTIONS: { value: PortalTheme; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
]
