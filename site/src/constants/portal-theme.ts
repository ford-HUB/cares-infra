export type PortalTheme = 'light' | 'dark' | 'system'

export type ResolvedPortalTheme = Exclude<PortalTheme, 'system'>

export const PORTAL_THEME_STORAGE_KEY = 'cares-portal-theme'

export const DEFAULT_PORTAL_THEME: PortalTheme = 'light'

export const PORTAL_DARK_CLASS = 'dark'

export const PREFERS_DARK_QUERY = '(prefers-color-scheme: dark)'

export const THEME_TRANSITION_MS = 500
export const THEME_TRANSITION_EASING = 'ease-in-out'

/** Pauses other CSS transitions during the switch (shadcn `disableTransitionOnChange`). */
export const THEME_SWITCHING_CLASS = 'theme-switching'

export const MODE_TOGGLE_SELECTOR = '[data-mode-toggle]'

export const PORTAL_THEME_OPTIONS: { value: PortalTheme; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
]
