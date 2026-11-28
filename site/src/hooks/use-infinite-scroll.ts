import { useEffect, type RefObject } from 'react'

interface InfiniteScrollOptions {
  sentinelRef: RefObject<Element | null>
  rootRef: RefObject<Element | null>
  /** False while in flight or exhausted, so it fires once per page. */
  enabled: boolean
  onLoadMore: () => void
  rootMargin?: string
}

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
