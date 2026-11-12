import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import {
  DEFAULT_PORTAL_THEME,
  PORTAL_THEME_STORAGE_KEY,
  type PortalTheme,
} from '../constants/portal-theme'

interface ThemeState {
  theme: PortalTheme
  setTheme: (theme: PortalTheme) => void
}

/**
 * The portal's light / dark / system choice. Remembered per browser — it is a
 * viewing preference, not account data, so it never goes to the server. Storage
 * that is blocked (private mode) just means the portal opens in light each time.
 * What `system` resolves to is read live in hooks/use-portal-theme.ts.
 */
export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: DEFAULT_PORTAL_THEME,
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: PORTAL_THEME_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ theme: s.theme }),
    },
  ),
)
