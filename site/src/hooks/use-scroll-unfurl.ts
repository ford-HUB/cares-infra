import { useEffect, useRef, useState } from 'react'
import { useReveal } from './use-reveal'

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'

/** Drives a scroll that unrolls once on first view. `triggerRef` goes on the scroll's
 *  wrapper (it opens when that scrolls into view); `sheetRef` goes on the sheet, whose
 *  height is tracked so the bottom roller can start tucked under the top one and travel
 *  down as the sheet is revealed. Under reduced motion the scroll is simply open. */
export function useScrollUnfurl<TSheet extends HTMLElement>() {
  const { ref: triggerRef, visible } = useReveal<HTMLDivElement>(0.2)
  const sheetRef = useRef<TSheet>(null)
  const [sheetHeight, setSheetHeight] = useState(0)
  const [reduceMotion] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(REDUCED_MOTION).matches,
  )

  useEffect(() => {
    const node = sheetRef.current
    if (!node) return
    const observer = new ResizeObserver(([entry]) => {
      // offsetHeight, not getBoundingClientRect: the rect is scaled by the landing zoom.
      if (entry) setSheetHeight((entry.target as HTMLElement).offsetHeight)
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return {
    triggerRef,
    sheetRef,
    open: visible || reduceMotion,
    sheetHeight,
    animate: !reduceMotion,
  }
}
