import { useEffect, useState } from 'react'

/**
 * Re-renders the caller on an interval so relative clocks — countdowns to the next
 * trigger, elapsed time on a run in flight — advance on screen without each of them
 * owning a timer.
 */
export function useClockTick(intervalMs = 1000, enabled = true): number {
  const [tick, setTick] = useState(() => Date.now())

  useEffect(() => {
    if (!enabled) return
    const timer = setInterval(() => setTick(Date.now()), intervalMs)
    return () => clearInterval(timer)
  }, [intervalMs, enabled])

  return tick
}
