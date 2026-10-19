import { useCallback, useEffect, useRef, useState } from 'react'

/** Drives a horizontal scroll-snap track: tracks which slide is leftmost and
 *  scrolls to a slide on demand. The track's direct children are the slides. */
export function useCarousel(slideCount: number) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)
  const [atStart, setAtStart] = useState(true)
  const [atEnd, setAtEnd] = useState(slideCount <= 1)

  const sync = useCallback(() => {
    const track = trackRef.current
    if (!track) return
    const slides = Array.from(track.children) as HTMLElement[]
    const left = track.scrollLeft
    let nearest = 0
    slides.forEach((slide, index) => {
      const distance = Math.abs(slide.offsetLeft - track.offsetLeft - left)
      const best = Math.abs(slides[nearest].offsetLeft - track.offsetLeft - left)
      if (distance < best) nearest = index
    })
    setActive(nearest)
    setAtStart(left <= 1)
    setAtEnd(left + track.clientWidth >= track.scrollWidth - 1)
  }, [])

  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    sync()
    track.addEventListener('scroll', sync, { passive: true })
    window.addEventListener('resize', sync)
    return () => {
      track.removeEventListener('scroll', sync)
      window.removeEventListener('resize', sync)
    }
  }, [sync, slideCount])

  const goTo = useCallback(
    (index: number) => {
      const track = trackRef.current
      if (!track) return
      const clamped = Math.max(0, Math.min(slideCount - 1, index))
      const slide = track.children[clamped] as HTMLElement | undefined
      if (!slide) return
      track.scrollTo({ left: slide.offsetLeft - track.offsetLeft, behavior: 'smooth' })
    },
    [slideCount],
  )

  return {
    trackRef,
    active,
    atStart,
    atEnd,
    goTo,
    next: () => goTo(active + 1),
    prev: () => goTo(active - 1),
  }
}
