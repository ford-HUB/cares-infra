import { Highlighter, Loader2, X } from 'lucide-react'
import type { RefObject } from 'react'
import { usePortalFindHighlight } from '../../hooks/use-portal-find-highlight'

interface PortalFindHighlighterProps {
  /** The scrolling content area to search — the chip itself must sit outside it. */
  containerRef: RefObject<HTMLElement | null>
}

/**
 * Paints the header search's text across the opened module and says what it found.
 * A miss is spelled out (and only after the module has had time to load) so the
 * viewer knows to check the module's other filters rather than wonder.
 */
export function PortalFindHighlighter({ containerRef }: PortalFindHighlighterProps) {
  const { term, active, count, status, dismiss } = usePortalFindHighlight(containerRef)
  if (!active) return null

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 z-40 flex justify-center px-4">
      <div
        role="status"
        className="pointer-events-auto flex max-w-full items-center gap-2 rounded-full border border-gray-200 bg-white py-1.5 pr-1.5 pl-3 text-[13px] text-gray-700 shadow-lg"
      >
        {status === 'searching' ? (
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-gray-400" />
        ) : (
          <Highlighter
            className={`h-3.5 w-3.5 shrink-0 ${status === 'found' ? 'text-amber-600' : 'text-gray-400'}`}
          />
        )}
        <span className="min-w-0 truncate">
          {status === 'found' && (
            <>
              <span className="font-semibold text-gray-900 tabular-nums">{count}</span>
              {count === 1 ? ' match' : ' matches'} for{' '}
            </>
          )}
          {status === 'searching' && 'Looking for '}
          <span className="portal-find-term font-semibold">“{term}”</span>
          {status === 'missing' && ' isn’t on this screen'}
        </span>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Clear highlight"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 focus-visible:ring-2 focus-visible:ring-[var(--cares-primary)] focus-visible:outline-none"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
