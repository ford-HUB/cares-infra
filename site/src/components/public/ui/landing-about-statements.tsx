import {
  LANDING_CONDENSED,
  LANDING_MOTION,
  LANDING_STATEMENTS,
} from '../../../constants/landing-bulletin'
import { useTilt } from '../../../hooks/use-tilt'
import { LandingReveal } from './landing-reveal'

type Statement = (typeof LANDING_STATEMENTS)[number]

/** One poster: tilts up to 2° toward the mouse and lifts while hovered. */
function StatementCard({ statement }: { statement: Statement }) {
  const ref = useTilt<HTMLElement>(LANDING_MOTION.aboutTiltDeg, LANDING_MOTION.aboutLiftPx)

  return (
    <article
      ref={ref}
      className="flex h-full flex-col items-center justify-center rounded-3xl bg-[var(--cares-about-poster)]/90 px-7 py-12 shadow-lg transition-[transform,box-shadow] duration-[450ms] ease-out hover:shadow-2xl sm:px-12 sm:py-14"
    >
      <h3
        className={`${LANDING_CONDENSED} text-[56px] leading-[0.95] font-bold tracking-tight text-center text-white uppercase sm:text-[76px]`}
      >
        {statement.title}
      </h3>
      <p
        className={`${LANDING_CONDENSED} mt-5 max-w-lg text-center text-[21px] leading-[1.3] font-semibold tracking-wide text-pretty text-[var(--cares-about-mint)] uppercase sm:text-[25px]`}
      >
        {statement.text}
      </p>
    </article>
  )
}

/** Vision and mission as two dark poster cards: a condensed uppercase headline and its
 *  text in mint on a plain green ground, centred in the card. Each fades up in turn on
 *  scroll. Side by side from lg, stacked below. */
export function LandingAboutStatements() {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {LANDING_STATEMENTS.map((statement, index) => (
        <LandingReveal
          key={statement.title}
          index={index}
          staggerMs={LANDING_MOTION.aboutStaggerMs}
          className="h-full"
        >
          <StatementCard statement={statement} />
        </LandingReveal>
      ))}
    </div>
  )
}
