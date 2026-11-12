import { CornerDownLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import type { PortalSearchEntry } from '../../../types/portal-search'
import { matchedRanges } from '../../../utils/portal-search-index'

interface PortalSearchResultProps {
  id: string
  entry: PortalSearchEntry
  query: string
  active: boolean
  onSelect: () => void
  onHover: () => void
}

/** The label with the typed words in bold, so it is clear why a row matched. */
function HighlightedLabel({ label, query }: { label: string; query: string }) {
  const ranges = matchedRanges(label, query)
  if (ranges.length === 0) return <>{label}</>
  const parts: ReactNode[] = []
  let cursor = 0
  ranges.forEach(([start, end]) => {
    if (start > cursor) parts.push(label.slice(cursor, start))
    parts.push(
      <mark key={start} className="bg-transparent font-semibold text-accent-foreground">
        {label.slice(start, end)}
      </mark>,
    )
    cursor = end
  })
  if (cursor < label.length) parts.push(label.slice(cursor))
  return <>{parts}</>
}

export function PortalSearchResult({
  id,
  entry,
  query,
  active,
  onSelect,
  onHover,
}: PortalSearchResultProps) {
  const Icon = entry.icon
  return (
    <li
      id={id}
      role="option"
      aria-selected={active}
      // Keep focus in the input so typing can carry on after a pointer hover.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onSelect}
      onMouseMove={onHover}
      className={`flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 transition-colors ${
        // Accent is a pale green in light mode and neutral charcoal in dark.
        active ? 'bg-accent' : ''
      }`}
    >
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
          active ? 'bg-white text-accent-foreground shadow-sm' : 'bg-gray-100 text-gray-500'
        }`}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-baseline gap-1.5">
          <span className="truncate text-[13px] font-medium text-gray-900">
            <HighlightedLabel label={entry.label} query={query} />
          </span>
          {entry.trail && (
            <span className="shrink-0 truncate text-[11px] text-gray-400">in {entry.trail}</span>
          )}
        </span>
        {entry.description && (
          <span className="block truncate text-[12px] text-gray-500">{entry.description}</span>
        )}
      </span>
      {active && <CornerDownLeft aria-hidden className="h-3.5 w-3.5 shrink-0 text-gray-400" />}
    </li>
  )
}
