import type { CSSProperties } from 'react'
import { AUTH_MODAL_REVEAL } from '../../../constants/auth-modal'

interface ModalReveal {
  className: string
  style: CSSProperties
}

/** Entrance for one piece of an auth modal's content, `step` places along the stagger.
 *  Text fades and rises 8px (400ms); a heading also comes out of a soft blur (500ms).
 *  Plays once as the modal's content mounts on open, never loops, and is skipped under
 *  reduced motion. Spread it onto the element: `<p {...modalReveal(2)}>`. */
export function modalReveal(step: number, kind: 'heading' | 'text' = 'text'): ModalReveal {
  return {
    className:
      kind === 'heading' ? 'motion-safe:animate-auth-heading-in' : 'motion-safe:animate-auth-text-in',
    style: { animationDelay: `${AUTH_MODAL_REVEAL.startMs + step * AUTH_MODAL_REVEAL.stepMs}ms` },
  }
}
