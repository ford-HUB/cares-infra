import { useEffect, useState } from 'react'

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

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
