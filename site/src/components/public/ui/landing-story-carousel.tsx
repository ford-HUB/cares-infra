import type { KeyboardEvent } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card } from '../../ui/card'
import { useCarousel } from '../../../hooks/use-carousel'
import { LANDING_SERIF, type LandingStory } from '../../../constants/landing-bulletin'

const ARROW_BUTTON =
  'flex h-9 w-9 items-center justify-center rounded-full bg-white text-[var(--cares-primary)] shadow-sm ring-1 ring-gray-200 transition-colors hover:bg-[var(--cares-primary)] hover:text-white disabled:pointer-events-none disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-[var(--cares-primary)] focus-visible:outline-none'

/** Swipeable, snap-scrolling row of story cards with arrow and dot controls. */
export function LandingStoryCarousel({ stories }: { stories: readonly LandingStory[] }) {
  const { trackRef, active, atStart, atEnd, goTo, next, prev } = useCarousel(stories.length)

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      next()
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      prev()
    }
  }

  return (
    <div role="region" aria-roledescription="carousel" aria-label="Stories">
      <div className="mb-4 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={prev}
          disabled={atStart}
          aria-label="Previous story"
          className={ARROW_BUTTON}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={next}
          disabled={atEnd}
          aria-label="Next story"
          className={ARROW_BUTTON}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div
        ref={trackRef}
        tabIndex={0}
        onKeyDown={onKeyDown}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-4 [scrollbar-width:none] focus-visible:outline-none [&::-webkit-scrollbar]:hidden"
      >
        {stories.map((story, index) => (
          <article
            key={story.title}
            aria-roledescription="slide"
            aria-label={`${index + 1} of ${stories.length}`}
            className="w-[85%] shrink-0 snap-start sm:w-[calc(50%-0.5rem)] lg:w-[calc((100%-2rem)/3)]"
          >
            <Card className="group h-full gap-0 pt-0 shadow-sm transition-[box-shadow,transform] duration-300 hover:-translate-y-1 hover:shadow-lg">
              <div className="relative overflow-hidden">
                <img
                  src={story.image}
                  alt={story.imageAlt}
                  loading="lazy"
                  className="aspect-[16/10] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
                <span
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-60 transition-opacity duration-500 group-hover:opacity-20"
                />
              </div>
              <div className="px-4 pt-4">
                <p className="text-[11px] tracking-wider text-gray-500 uppercase">
                  {story.department}
                </p>
                <h3
                  className={`${LANDING_SERIF} mt-1.5 text-[17px] leading-snug text-balance text-[var(--cares-heading)] transition-colors duration-300 group-hover:text-[var(--cares-primary-hover)]`}
                >
                  {story.title}
                </h3>
                <p className="mt-2 text-[13px] leading-relaxed text-pretty text-gray-600">
                  {story.summary}
                </p>
              </div>
            </Card>
          </article>
        ))}
      </div>

      <div className="mt-2 flex justify-center gap-1.5">
        {stories.map((story, index) => (
          <button
            key={story.title}
            type="button"
            onClick={() => goTo(index)}
            aria-label={`Go to story ${index + 1}: ${story.title}`}
            aria-current={index === active}
            className={cn(
              'h-1.5 rounded-full transition-[width,background-color] duration-300 focus-visible:ring-2 focus-visible:ring-[var(--cares-primary)] focus-visible:outline-none',
              index === active
                ? 'w-6 bg-[var(--cares-primary)]'
                : 'w-1.5 bg-gray-300 hover:bg-gray-400',
            )}
          />
        ))}
      </div>
    </div>
  )
}
