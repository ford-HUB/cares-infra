import { useEffect, useState } from 'react'

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Counts from 0 to `target` with an ease-out curve once `start` is true. Reduced
 *  motion (or a non-positive target) shows the final value immediately. */
export function useCountUp(target: number, start: boolean, durationMs: number) {
  const [value, setValue] = useState(0)
  const skip = target <= 0 || prefersReducedMotion()

  useEffect(() => {
    if (!start || skip) return

    let frame = 0
    const began = performance.now()
    const tick = (now: number) => {
      const progress = Math.min(1, (now - began) / durationMs)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(target * eased))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, start, skip, durationMs])

  return skip ? target : value
}
