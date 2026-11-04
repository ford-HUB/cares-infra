import type { AuthModalLinkState } from '../types/auth-modal'

/** Router state on links that open an auth modal from the landing page, so closing it
 *  steps back in history instead of stacking a second copy of the page. */
export const AUTH_MODAL_LINK_STATE: AuthModalLinkState = { fromLanding: true }

/** Text and labels inside an auth modal rise in one after another as it opens: the first
 *  starts this long after the card, then each follows a step behind. */
export const AUTH_MODAL_REVEAL = {
  startMs: 140,
  stepMs: 60,
} as const
