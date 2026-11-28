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

/** Per-browser preference, never sent to the server; blocked storage falls back to light. */
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
