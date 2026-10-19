import { LANDING_STORIES, LANDING_UPDATES } from '../../constants/landing-bulletin'
import { LandingReveal } from './ui/landing-reveal'
import { LandingSectionHeading } from './ui/landing-section-heading'
import { LandingStoryCarousel } from './ui/landing-story-carousel'

export function LandingHighlights() {
  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
      <LandingReveal>
        <LandingSectionHeading
          title="From the departments"
          description="Swipe or use the arrows to browse this year's featured stories."
        />
      </LandingReveal>

      <LandingReveal>
        <LandingStoryCarousel stories={LANDING_STORIES} />
      </LandingReveal>

      <div className="mt-14">
        <h3 className="text-[15px] font-semibold text-[var(--cares-heading)]">
          UCLM CARES updates
        </h3>
        <ol className="mt-4 grid gap-x-8 sm:grid-cols-2">
          {LANDING_UPDATES.map((update, index) => (
            <LandingReveal
              key={update.title}
              as="li"
              index={index % 2}
              className="group flex gap-4 border-t border-[var(--cares-border)] py-3"
            >
              <time className="flex w-24 shrink-0 items-start gap-2 pt-px text-[12px] font-medium text-[var(--cares-primary-hover)] tabular-nums">
                <span
                  aria-hidden
                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-300 transition-colors duration-300 group-hover:bg-[var(--cares-primary)]"
                />
                {update.date}
              </time>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-gray-900">{update.title}</p>
                <p className="mt-0.5 text-[12px] text-pretty text-gray-500">{update.detail}</p>
              </div>
            </LandingReveal>
          ))}
        </ol>
      </div>
    </section>
  )
}
