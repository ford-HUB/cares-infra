import { useEffect, useState } from 'react'

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Steps through 0..count-1 every `intervalMs`, pausing while the tab is hidden.
 *  Under reduced motion it stays on the first item. */
export function useRotatingIndex(count: number, intervalMs: number) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (count <= 1 || prefersReducedMotion()) return
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') setIndex((i) => (i + 1) % count)
    }, intervalMs)
    return () => window.clearInterval(id)
  }, [count, intervalMs])

  return index
}
