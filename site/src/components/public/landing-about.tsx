import { Eye, Flag, Target } from 'lucide-react'
import {
  LANDING_GOALS,
  LANDING_MISSION,
  LANDING_OPPORTUNITIES,
  LANDING_SECTION_IDS,
  LANDING_SERIF,
  LANDING_VISION,
} from '../../constants/landing-bulletin'
import { LandingReveal } from './ui/landing-reveal'
import { LandingSectionHeading } from './ui/landing-section-heading'

const STATEMENTS = [
  { label: 'Vision', icon: Eye, text: LANDING_VISION },
  { label: 'Mission', icon: Target, text: LANDING_MISSION },
] as const

const NUMBER_BADGE =
  'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--cares-primary)] text-[11px] font-semibold text-white tabular-nums transition-transform duration-300 group-hover:scale-110'

/** Vision and mission as two quote cards, then the goals as a numbered list. */
export function LandingAbout() {
  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
      <LandingReveal>
        <LandingSectionHeading title="Vision and mission" />
      </LandingReveal>

      <div className="grid gap-4 md:grid-cols-2">
        {STATEMENTS.map((statement, index) => (
          <LandingReveal key={statement.label} index={index} className="h-full">
            <figure className="group relative h-full overflow-hidden rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 transition-shadow duration-300 hover:shadow-lg sm:p-8">
              <span
                aria-hidden
                className={`${LANDING_SERIF} pointer-events-none absolute -top-4 right-4 text-8xl leading-none text-emerald-50 transition-colors duration-500 select-none group-hover:text-emerald-100`}
              >
                &ldquo;
              </span>
              <figcaption className="relative flex items-center gap-2 text-[11px] font-semibold tracking-wider text-[var(--cares-primary-hover)] uppercase">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 transition-colors duration-300 group-hover:bg-[var(--cares-primary)] group-hover:text-white">
                  <statement.icon className="h-4 w-4" />
                </span>
                {statement.label}
              </figcaption>
              <blockquote
                className={`${LANDING_SERIF} relative mt-4 text-xl leading-relaxed text-pretty text-[var(--cares-heading)]`}
              >
                {statement.text}
              </blockquote>
            </figure>
          </LandingReveal>
        ))}
      </div>

      <div id={LANDING_SECTION_IDS.goals} className="mt-16 scroll-mt-28">
        <LandingReveal>
          <LandingSectionHeading
            title="Goals"
            description="What every CARES program, in every department, is designed to achieve."
          />
        </LandingReveal>

        <ol className="grid gap-4 md:grid-cols-2">
          {LANDING_GOALS.map((goal, index) => (
            <LandingReveal key={goal} as="li" index={index % 2}>
              <div className="group flex h-full gap-3 rounded-xl bg-white p-5 text-[14px] leading-relaxed text-pretty text-[var(--cares-body)] shadow-sm ring-1 ring-gray-200">
                <span className={NUMBER_BADGE}>{index + 1}</span>
                {goal}
              </div>
            </LandingReveal>
          ))}
          <LandingReveal as="li" index={LANDING_GOALS.length % 2}>
            <div className="group flex h-full gap-3 rounded-xl bg-white p-5 text-[14px] leading-relaxed text-[var(--cares-body)] shadow-sm ring-1 ring-gray-200">
              <span className={NUMBER_BADGE}>{LANDING_GOALS.length + 1}</span>
              <div className="min-w-0">
                Create opportunities in the service programs for:
                <ul className="mt-2 flex flex-col gap-1.5">
                  {LANDING_OPPORTUNITIES.map((item, index) => (
                    <li key={item} className="flex gap-2 text-[13px] text-[var(--cares-muted)]">
                      <span className="font-semibold text-[var(--cares-primary-hover)]">
                        {String.fromCharCode(65 + index)}.
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </LandingReveal>
        </ol>

        <p className="mt-4 flex items-center gap-2 text-[11px] text-gray-400">
          <Flag className="h-3 w-3" />
          Adopted from the UCLM CARES vision, mission and objectives.
        </p>
      </div>
    </section>
  )
}
