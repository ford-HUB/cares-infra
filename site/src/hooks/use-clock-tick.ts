import { useEffect, useState } from 'react'

export function useClockTick(intervalMs = 1000, enabled = true): number {
  const [tick, setTick] = useState(() => Date.now())

  useEffect(() => {
    if (!enabled) return
    const timer = setInterval(() => setTick(Date.now()), intervalMs)
    return () => clearInterval(timer)
  }, [intervalMs, enabled])

  return tick
}
