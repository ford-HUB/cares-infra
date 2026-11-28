import type { CSSProperties } from 'react'
import { AUTH_MODAL_REVEAL } from '../../../constants/auth-modal'

interface ModalReveal {
  className: string
  style: CSSProperties
}

/** Staggered entrance at `step`, skipped under reduced motion. Usage: `<p {...modalReveal(2)}>`. */
export function modalReveal(step: number, kind: 'heading' | 'text' = 'text'): ModalReveal {
  return {
    className:
      kind === 'heading' ? 'motion-safe:animate-auth-heading-in' : 'motion-safe:animate-auth-text-in',
    style: { animationDelay: `${AUTH_MODAL_REVEAL.startMs + step * AUTH_MODAL_REVEAL.stepMs}ms` },
  }
}
