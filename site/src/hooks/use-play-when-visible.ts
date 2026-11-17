import { useEffect, useRef } from 'react'

/** Input that browsers count as the viewer engaging with the page, which is what lets a
 *  video's sound come on. Scrolling (wheel or touch-drag) is not one of them. */
const ACTIVATION_EVENTS = ['pointerdown', 'pointerup', 'touchend', 'keydown', 'click'] as const

/** Starts a video with sound once `threshold` of it is on screen, pauses it when it
 *  scrolls away, and resumes it on return. A pause made by the viewer sticks.
 *  Browsers refuse sound until the viewer has interacted with the site, so a refused
 *  start plays muted and the speaker comes on at the viewer's very first tap, click or
 *  key press anywhere on the page. Under prefers-reduced-motion nothing starts on its
 *  own; the player controls still work. */
export function usePlayWhenVisible(threshold: number) {
  const ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = ref.current
    if (!video || typeof IntersectionObserver === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const stopListening = () => {
      for (const type of ACTIVATION_EVENTS) window.removeEventListener(type, unmuteOnActivation)
    }

    function unmuteOnActivation(event: Event) {
      // On the player itself, wait for the click so the native mute button acts first
      // and isn't toggled straight back.
      if (event.target === video && event.type !== 'click') return
      // Not every key press counts (Escape doesn't); unmuting without one would pause it.
      if (navigator.userActivation && !navigator.userActivation.isActive) return
      stopListening()
      if (video) video.muted = false
    }

    let waitingToPlay = true
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry && entry.intersectionRatio >= threshold) {
          if (!waitingToPlay) return
          waitingToPlay = false
          video.play().catch((error: unknown) => {
            if (!(error instanceof DOMException) || error.name !== 'NotAllowedError') return
            video.muted = true
            for (const type of ACTIVATION_EVENTS) {
              window.addEventListener(type, unmuteOnActivation, { passive: true })
            }
            // A blocked or unsupported start leaves the poster and controls in place.
            video.play().catch(() => undefined)
          })
        } else if (!video.paused) {
          video.pause()
          waitingToPlay = true
        }
      },
      { threshold },
    )
    observer.observe(video)
    return () => {
      observer.disconnect()
      stopListening()
    }
  }, [threshold])

  return ref
}
