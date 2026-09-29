import { useEffect, type RefObject } from 'react'

interface InfiniteScrollOptions {
  /** Element rendered after the last row; loading starts when it scrolls into view. */
  sentinelRef: RefObject<Element | null>
  /** The scrolling container the sentinel lives in — the observer's viewport. */
  rootRef: RefObject<Element | null>
  /** False while a page is in flight or the list is exhausted, so it fires once per page. */
  enabled: boolean
  onLoadMore: () => void
  /** How early to start loading, as a margin around the container. */
  rootMargin?: string
}

/**
 * Loads the next page when the sentinel nears the bottom of its scroll container.
 * Disabling while a fetch is in flight is what keeps one scroll from firing several
 * requests — the observer is torn down, then rebuilt below the newly appended rows.
 */
export function useInfiniteScroll({
  sentinelRef,
  rootRef,
  enabled,
  onLoadMore,
  rootMargin = '240px',
}: InfiniteScrollOptions): void {
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !enabled) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) onLoadMore()
      },
      { root: rootRef.current, rootMargin },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [sentinelRef, rootRef, enabled, onLoadMore, rootMargin])
}
