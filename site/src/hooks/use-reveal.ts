import { useEffect, useRef, useState } from 'react'

/** Flips `visible` to true the first time the element scrolls into view, then stops
 *  observing. Falls back to visible when IntersectionObserver is unavailable. */
export function useReveal<T extends Element>(threshold = 0.15) {
  const ref = useRef<T>(null)
  const [visible, setVisible] = useState(() => typeof IntersectionObserver === 'undefined')

  useEffect(() => {
    const node = ref.current
    if (!node || visible) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold, rootMargin: '0px 0px -8% 0px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [threshold, visible])

  return { ref, visible }
}
