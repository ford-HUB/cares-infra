import { useEffect, useRef } from 'react'

/** Inputs browsers count as user activation; scrolling isn't one. */
const ACTIVATION_EVENTS = ['pointerdown', 'pointerup', 'touchend', 'keydown', 'click'] as const

/** Browsers block sound before user activation, so a refused start plays muted until the first interaction. */
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
      // Wait for the click so the native mute button acts first.
      if (event.target === video && event.type !== 'click') return
      // Escape etc. don't count as activation; unmuting without one would pause it.
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
