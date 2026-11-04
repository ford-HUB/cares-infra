import { LANDING_MOTION, LANDING_SERIF } from '../../../constants/landing-bulletin'
import {
  type LandingHighlightStory as Story,
  type LandingHighlightYear as Year,
} from '../../../constants/landing-highlights'
import { useReveal } from '../../../hooks/use-reveal'
import { LandingHighlightArticle } from './landing-highlight-story'
import { LandingReveal } from './landing-reveal'

interface HighlightRow {
  left: Story[]
  lead: Story
  right: Story[]
}

/** Deals stories into rows of left, lead and right. Any left over stack in the last row's
 *  outer columns, so no row is left with an empty column. */
function toRows(stories: readonly Story[]): HighlightRow[] {
  const rows: HighlightRow[] = []
  for (let i = 0; i + 3 <= stories.length; i += 3) {
    rows.push({ left: [stories[i]], lead: stories[i + 1], right: [stories[i + 2]] })
  }

  const extras = stories.slice(rows.length * 3)
  const last = rows.at(-1)
  if (last && extras.length === 2) {
    last.left.push(extras[0])
    last.right.push(extras[1])
  } else if (last && extras.length === 1) {
    last.right.push(extras[0])
  }

  return rows
}

interface LandingHighlightYearProps {
  highlight: Year
}

/* From lg, each column carries a hairline on its left (but the first), padded off both
 * sides. Columns keep their own height (self-start), so a hairline only runs as far as
 * the stories beside it and never down empty space. */
const COLUMN =
  'lg:self-start lg:px-6 lg:first:pl-0 lg:last:pr-0 lg:[&:not(:first-child)]:border-l lg:border-gray-300'

/** One story fading up in turn: left column, then the lead, then the right. */
function StaggeredStory({
  story,
  step,
  variant,
}: {
  story: Story
  step: number
  variant: 'lead' | 'side'
}) {
  return (
    <LandingReveal
      index={step}
      staggerMs={LANDING_MOTION.highlightStaggerMs}
      className="mb-6 last:mb-0"
    >
      <LandingHighlightArticle story={story} variant={variant} />
    </LandingReveal>
  )
}

/** The big year numerals: once they scroll into view they slide up out of a mask and
 *  sharpen from a blur (800ms, ease-out, once). The rule beneath stays put. Under reduced
 *  motion the year is simply shown. */
function YearHeading({ year }: { year: number }) {
  const { ref, visible } = useReveal<HTMLHeadingElement>(0.5)

  return (
    <h2
      ref={ref}
      className={`${LANDING_SERIF} border-b-4 border-[var(--cares-heading)] pb-2 text-6xl font-bold text-[var(--cares-heading)] sm:text-8xl`}
    >
      {/* The mask: a little vertical slack (cancelled by the negative margin) so the
          numerals' edges are not clipped once they settle. */}
      <span className="-my-[0.1em] inline-block overflow-hidden py-[0.1em] align-bottom">
        <span
          className={`inline-block ${visible ? 'motion-safe:animate-landing-year-rise' : 'motion-safe:opacity-0'}`}
        >
          {year}
        </span>
      </span>
    </h2>
  )
}

/** One year, laid out like a newspaper page: a big year heading over rows of three stories
 *  around a wide lead, each column ruled off from the next. */
export function LandingHighlightYear({ highlight }: LandingHighlightYearProps) {
  const { year, stories } = highlight
  const featured = (feature: Story['feature']) =>
    stories.filter((story) => story.feature === feature)
  const [topLead] = featured('lead')
  const rows: HighlightRow[] = [
    { left: featured('left'), lead: topLead, right: featured('right') },
    ...toRows(stories.filter((story) => !story.feature)),
  ]

  return (
    <section className="mt-16 first:mt-0">
      <YearHeading year={year} />

      <div className="mt-8">
        {rows.map(({ left, lead, right }) => (
          <div key={lead.image} className="grid gap-y-6 pb-6 lg:grid-cols-[1fr_1.7fr_1fr]">
            <div className={COLUMN}>
              {left.map((story, i) => (
                <StaggeredStory key={story.image} story={story} step={i * 3} variant="side" />
              ))}
            </div>

            <div className={`order-first lg:order-none ${COLUMN}`}>
              <StaggeredStory story={lead} step={1} variant="lead" />
            </div>

            <div className={COLUMN}>
              {right.map((story, i) => (
                <StaggeredStory key={story.image} story={story} step={2 + i * 3} variant="side" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
