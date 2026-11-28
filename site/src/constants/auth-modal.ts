import type { AuthModalLinkState } from '../types/auth-modal'

/** Lets closing the modal step back in history instead of stacking the page. */
export const AUTH_MODAL_LINK_STATE: AuthModalLinkState = { fromLanding: true }

export const AUTH_MODAL_REVEAL = {
  startMs: 140,
  stepMs: 60,
} as const
