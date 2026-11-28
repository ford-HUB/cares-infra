import { useEffect, type RefObject } from 'react'
import { MIN_FIT_SCALE } from '../constants/certificate-typography'

/** Scale is written to the node, not state, so drag doesn't re-render per pixel. */
export function useFitToBox(
  box: RefObject<HTMLElement | null>,
  content: RefObject<HTMLElement | null>,
  enabled: boolean,
) {
  useEffect(() => {
    const boxNode = box.current
    const contentNode = content.current
    if (!boxNode || !contentNode) return

    if (!enabled) {
      contentNode.style.removeProperty('--fit')
      return
    }

    // Guards against re-measuring the size this callback just set.
    let measuring = false

    const fit = () => {
      if (measuring) return
      measuring = true

      contentNode.style.setProperty('--fit', '1')
      const natural = contentNode.offsetHeight
      const available = boxNode.clientHeight
      const scale =
        available > 0 && natural > available
          ? Math.max(MIN_FIT_SCALE, available / natural)
          : 1

      contentNode.style.setProperty('--fit', String(scale))
      requestAnimationFrame(() => {
        measuring = false
      })
    }

    fit()

    const observer = new ResizeObserver(fit)
    observer.observe(boxNode)
    observer.observe(contentNode)

    return () => observer.disconnect()
  }, [box, content, enabled])
}
