import { useEffect, useRef } from 'react'

const CAN_TILT = '(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)'

/** Writes the transform to the node so pointer moves don't re-render. */
export function useTilt<T extends HTMLElement>(maxDeg: number, liftPx: number) {
  const ref = useRef<T>(null)

  useEffect(() => {
    const node = ref.current
    if (!node || !window.matchMedia(CAN_TILT).matches) return

    const move = (event: PointerEvent) => {
      const box = node.getBoundingClientRect()
      const x = (event.clientX - box.left) / box.width - 0.5
      const y = (event.clientY - box.top) / box.height - 0.5
      const rotateX = (-y * 2 * maxDeg).toFixed(2)
      const rotateY = (x * 2 * maxDeg).toFixed(2)
      node.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-${liftPx}px)`
    }
    const reset = () => {
      node.style.transform = ''
    }

    node.addEventListener('pointermove', move)
    node.addEventListener('pointerleave', reset)
    return () => {
      node.removeEventListener('pointermove', move)
      node.removeEventListener('pointerleave', reset)
      reset()
    }
  }, [maxDeg, liftPx])

  return ref
}
