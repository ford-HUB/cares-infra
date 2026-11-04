import { useEffect, useRef } from 'react'

/** Starts a video with sound only once `threshold` of it is on screen, pauses it when
 *  it scrolls away, and resumes it on return. A pause or mute made by the viewer sticks.
 *  Browsers block sound until the viewer has interacted with the site, so a blocked
 *  start plays muted and the sound comes on at their first click or tap. Under
 *  prefers-reduced-motion nothing starts on its own; the player controls still work. */
export function usePlayWhenVisible(threshold: number) {
  const ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = ref.current
    if (!video || typeof IntersectionObserver === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const unmute = () => {
      video.muted = false
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
            // Bubble phase, so a click on the player's own mute button isn't undone.
            window.addEventListener('click', unmute, { once: true })
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
      window.removeEventListener('click', unmute)
    }
  }, [threshold])

  return ref
}
