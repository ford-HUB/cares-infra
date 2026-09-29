import { useEffect, type RefObject } from 'react'
import { MIN_FIT_SCALE } from '../constants/certificate-typography'

/**
 * Keeps a block's text inside a box it was resized to: when the copy is taller than
 * the height the director dragged, the `--fit` custom property shrinks every line in
 * step until it fits, and returns to 1 as soon as there is room again.
 *
 * The scale is written straight to the node rather than held in state — it is a
 * measurement of the DOM, and a render pass per pixel of drag would fight the drag.
 */
export function useFitToBox(
  box: RefObject<HTMLElement | null>,
  content: RefObject<HTMLElement | null>,
  /** Off while the block still sizes itself to its text — nothing can overflow. */
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

    // Measuring resizes the node, which wakes the observer again; the flag keeps that
    // second pass from re-measuring a size this callback just set.
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
