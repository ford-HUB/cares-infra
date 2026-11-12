import { LogOut, Moon, Sun } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  PORTAL_RECORD_SEARCH_MIN_CHARS,
  PORTAL_SEARCH_GROUP_ORDER,
  PORTAL_SEARCH_SHORTCUT_KEY,
} from '../constants/portal-search'
import { useAuthStore } from '../store/auth-store'
import { useResolvedTheme } from './use-portal-theme'
import { useThemeSwitch } from './use-theme-switch'
import type { PortalNavConfig } from '../types/nav'
import type { PortalSearchEntry, PortalSearchKind } from '../types/portal-search'
import { portalFindState } from '../utils/portal-find'
import { buildPortalSearchIndex, rankPortalEntries } from '../utils/portal-search-index'
import { usePortalRecords } from './use-portal-records'

export interface PortalSearchGroup {
  kind: PortalSearchKind
  entries: PortalSearchEntry[]
}

/**
 * The header search. Finds people and records inside modules (see
 * use-portal-records), every module and page, settings sections and a couple of
 * actions — all limited to what this account may open. Opening a record carries
 * the typed text along, so the module filters to it and highlights it.
 */
export function usePortalSearch(nav: PortalNavConfig, onSignOut: () => void) {
  const role = useAuthStore((s) => s.user?.role)
  const permissionList = useAuthStore((s) => s.user?.permissions)
  const theme = useResolvedTheme()
  const switchTheme = useThemeSwitch()
  const navigate = useNavigate()

  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const permissions = useMemo(() => new Set(permissionList ?? []), [permissionList])
  const pages = useMemo(
    () => buildPortalSearchIndex(nav, role, permissions),
    [nav, role, permissions],
  )
  const allowedRoutes = useMemo(
    () => new Set(pages.flatMap((p) => (p.to ? [p.to] : []))),
    [pages],
  )
  const { records, loading: recordsLoading, ensureLoaded } = usePortalRecords(allowedRoutes)
  const actions = useMemo<PortalSearchEntry[]>(
    () => [
      {
        id: 'action:toggle-theme',
        kind: 'action',
        action: 'toggle-theme',
        label: theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode',
        description: 'Change the portal colour theme',
        keywords: ['dark mode', 'light mode', 'theme', 'appearance', 'night'],
        icon: theme === 'dark' ? Sun : Moon,
      },
      {
        id: 'action:sign-out',
        kind: 'action',
        action: 'sign-out',
        label: 'Sign out',
        description: 'End this session',
        keywords: ['logout', 'log out', 'exit'],
        icon: LogOut,
      },
    ],
    [theme],
  )

  // Groups are ordered by their best match (ties fall back to the fixed order), so
  // "bea" leads with the person and "event" with the module — and Enter opens it.
  // `flat` is that same order, so arrow keys walk the list exactly as it is drawn.
  const { groups, flat } = useMemo(() => {
    const ranked = rankPortalEntries([...records, ...pages, ...actions], query)
    const grouped = PORTAL_SEARCH_GROUP_ORDER.map((kind, order) => {
      const inGroup = ranked.filter((r) => r.entry.kind === kind)
      return {
        group: { kind, entries: inGroup.map((r) => r.entry) } satisfies PortalSearchGroup,
        best: inGroup[0]?.score ?? -1,
        order,
      }
    })
      .filter((g) => g.group.entries.length > 0)
      .sort((a, b) => b.best - a.best || a.order - b.order)
      .map((g) => g.group)
    return { groups: grouped, flat: grouped.flatMap((g) => g.entries) }
  }, [records, pages, actions, query])

  const close = useCallback(() => {
    setOpen(false)
    setActiveIndex(0)
  }, [])

  const select = useCallback(
    (entry: PortalSearchEntry) => {
      const term = query.trim()
      close()
      setQuery('')
      inputRef.current?.blur()
      if (entry.to && entry.find && term) {
        // Highlight what was typed ("bea"), not the record's full name.
        navigate(entry.to, { state: portalFindState({ term, nonce: Date.now() }) })
      } else if (entry.to) navigate(entry.to)
      else if (entry.action === 'toggle-theme') switchTheme(theme === 'dark' ? 'light' : 'dark')
      else if (entry.action === 'sign-out') onSignOut()
    },
    [query, close, navigate, theme, switchTheme, onSignOut],
  )

  const onQueryChange = (value: string) => {
    setQuery(value)
    setActiveIndex(0)
    setOpen(true)
    if (value.trim().length >= PORTAL_RECORD_SEARCH_MIN_CHARS) ensureLoaded()
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      setOpen(true)
      if (flat.length === 0) return
      const step = e.key === 'ArrowDown' ? 1 : -1
      setActiveIndex((i) => (i + step + flat.length) % flat.length)
    } else if (e.key === 'Enter') {
      const entry = flat[activeIndex]
      if (open && entry) {
        e.preventDefault()
        select(entry)
      }
    } else if (e.key === 'Escape') {
      if (query) setQuery('')
      else inputRef.current?.blur()
      close()
    }
  }

  // Ctrl+K / ⌘K from anywhere in the portal.
  useEffect(() => {
    const onShortcut = (e: globalThis.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === PORTAL_SEARCH_SHORTCUT_KEY) {
        e.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
        setOpen(true)
      }
    }
    document.addEventListener('keydown', onShortcut)
    return () => document.removeEventListener('keydown', onShortcut)
  }, [])

  // A click anywhere outside the field and its results closes the list.
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) close()
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open, close])

  return {
    query,
    open,
    groups,
    flat,
    recordsLoading: recordsLoading && query.trim().length >= PORTAL_RECORD_SEARCH_MIN_CHARS,
    activeIndex,
    setActiveIndex,
    inputRef,
    containerRef,
    onQueryChange,
    onKeyDown,
    onFocus: () => setOpen(true),
    select,
  }
}
