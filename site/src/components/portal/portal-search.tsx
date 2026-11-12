import { Loader2, Search, SearchX } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import {
  PORTAL_SEARCH_GROUP_LABELS,
  PORTAL_SEARCH_PLACEHOLDER,
  portalSearchShortcutLabel,
} from '../../constants/portal-search'
import { usePortalSearch } from '../../hooks/use-portal-search'
import type { PortalNavConfig } from '../../types/nav'
import { PortalSearchResult } from './ui/portal-search-result'

const LISTBOX_ID = 'portal-search-results'
const optionId = (index: number) => `portal-search-option-${index}`

interface PortalSearchProps {
  nav: PortalNavConfig
  onSignOut: () => void
}

/** Header search over every module, page, setting and action the account can use. */
export function PortalSearch({ nav, onSignOut }: PortalSearchProps) {
  const {
    query,
    open,
    groups,
    flat,
    recordsLoading,
    activeIndex,
    setActiveIndex,
    inputRef,
    containerRef,
    onQueryChange,
    onKeyDown,
    onFocus,
    select,
  } = usePortalSearch(nav, onSignOut)
  const shortcut = useMemo(() => portalSearchShortcutLabel(), [])

  // Keep the highlighted row in view while arrowing through a long list.
  useEffect(() => {
    if (!open) return
    document.getElementById(optionId(activeIndex))?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, open])

  return (
    <div ref={containerRef} className="relative max-w-md min-w-0 flex-1">
      <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--cares-muted)]" />
      <input
        ref={inputRef}
        type="search"
        role="combobox"
        aria-expanded={open}
        aria-controls={LISTBOX_ID}
        aria-autocomplete="list"
        aria-activedescendant={open && flat.length > 0 ? optionId(activeIndex) : undefined}
        aria-label="Search the portal"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        onFocus={onFocus}
        onKeyDown={onKeyDown}
        placeholder={PORTAL_SEARCH_PLACEHOLDER}
        className="w-full rounded-lg border border-gray-300 bg-gray-50 py-2 pr-4 pl-10 text-sm text-gray-900 transition-colors placeholder:text-gray-400 focus:border-[var(--cares-primary-hover)] focus:bg-white focus:ring-2 focus:ring-[var(--cares-primary-hover)]/25 focus:outline-none sm:pr-16"
      />
      {!query && (
        <kbd className="pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 rounded border border-gray-300 px-1.5 py-0.5 font-sans text-xs text-gray-400 sm:block">
          {shortcut}
        </kbd>
      )}

      {open && (
        <div className="absolute top-full right-0 left-0 z-50 mt-2 min-w-[18rem] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
          {flat.length === 0 && recordsLoading ? (
            <div className="flex items-center justify-center gap-2 px-4 py-8 text-[13px] text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching people and records…
            </div>
          ) : flat.length === 0 ? (
            <div className="flex flex-col items-center gap-1 px-4 py-8 text-center">
              <SearchX className="mb-1 h-5 w-5 text-gray-400" />
              <p className="text-[13px] font-medium text-gray-900">No matches for “{query}”</p>
              <p className="text-[12px] text-gray-500">
                Try a person’s name, an event, or a module like “events” or “logs”.
              </p>
            </div>
          ) : (
            <ul
              id={LISTBOX_ID}
              role="listbox"
              aria-label="Search results"
              className="max-h-[min(26rem,65vh)] overflow-y-auto p-1.5"
            >
              {groups.map((group) => (
                <li key={group.kind} role="presentation">
                  <p className="px-2.5 pt-2 pb-1 text-[11px] tracking-wider text-gray-500 uppercase">
                    {PORTAL_SEARCH_GROUP_LABELS[group.kind]}
                  </p>
                  <ul role="presentation">
                    {group.entries.map((entry) => {
                      // Position in the flat, keyboard-order list (a few dozen rows at most).
                      const index = flat.indexOf(entry)
                      return (
                        <PortalSearchResult
                          key={entry.id}
                          id={optionId(index)}
                          entry={entry}
                          query={query}
                          active={index === activeIndex}
                          onSelect={() => select(entry)}
                          onHover={() => setActiveIndex(index)}
                        />
                      )
                    })}
                  </ul>
                </li>
              ))}
            </ul>
          )}
          <div className="hidden items-center gap-3 border-t border-gray-100 bg-gray-50 px-3 py-2 text-[11px] text-gray-500 sm:flex">
            <span>
              <kbd className="font-sans font-medium text-gray-700">↑↓</kbd> to move
            </span>
            <span>
              <kbd className="font-sans font-medium text-gray-700">↵</kbd> to open
            </span>
            <span>
              <kbd className="font-sans font-medium text-gray-700">Esc</kbd> to close
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
