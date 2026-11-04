import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import {
  LANDING_CONDENSED,
  LANDING_MOTION,
  LANDING_OBJECTIVES,
  LANDING_OPPORTUNITIES,
  LANDING_OPPORTUNITIES_OBJECTIVE,
  LANDING_SLAB,
} from '../../../constants/landing-bulletin'
import { GlassSheen } from './landing-glass-sheen'
import { LandingReveal } from './landing-reveal'

/** Frosted glass card: a warm cream-to-mint fill, a bright top edge and a
 *  soft green glow, with light and water ripples drawn over it (GlassSheen). Not
 *  clipped, so the number ribbon can hang past its left edge; the top padding clears it. */
const OBJECTIVE_CARD =
  'relative isolate flex h-full rounded-2xl border border-[var(--cares-primary)] bg-gradient-to-br from-[var(--cares-about-card)] via-emerald-50/80 to-emerald-100/70 px-5 pt-22 pb-6 shadow-[0_12px_28px_-16px_rgba(21,128,61,0.45),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-md sm:px-6'

/* 01–03 on hover: a 4px lift, the edge turning mint with a soft mint glow around it, and
 * the ribbon brightening a touch. */
const OBJECTIVE_HOVER =
  'group transition-[translate,box-shadow,border-color] duration-[400ms] ease-out hover:border-emerald-400/80 hover:shadow-[0_0_0_3px_rgba(110,231,183,0.35),0_14px_30px_-14px_rgba(16,185,129,0.45)] motion-safe:hover:-translate-y-1'

/* The A, B and C parts, glass too, on hover: a gentle lift while a brighter mint wash
 * fades in. */
const OPPORTUNITY_CARD =
  'group/part relative isolate flex h-full flex-col gap-3 overflow-hidden rounded-xl border border-[var(--cares-primary)] bg-gradient-to-br from-[var(--cares-about-card)]/90 to-emerald-100/70 p-4 shadow-[0_8px_20px_-12px_rgba(21,128,61,0.4),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-sm transition-[translate,box-shadow] duration-[400ms] ease-out hover:shadow-md hover:ring-emerald-400/40 sm:p-5 motion-safe:hover:-translate-y-[3px]'

const stagger = LANDING_MOTION.aboutStaggerMs

const padNumber = (n: number) => String(n).padStart(2, '0')

/** The objectives' wording, 01 to 03 and the A, B and C parts alike: bold, justified. */
const OBJECTIVE_TEXT = 'text-justify text-[15px] leading-relaxed font-bold text-neutral-800 sm:text-base'

/** The objective's number on a dark-green ribbon pinned across the card's top-left:
 *  it hangs 12px past the left edge, where a darker fold tucks back under the card, and
 *  ends in a rounded tip. */
function NumberRibbon({ number }: { number: number }) {
  return (
    <div aria-hidden className="absolute top-5 -left-3 z-10">
      <span
        className={`${LANDING_CONDENSED} flex h-12 min-w-36 items-center justify-end rounded-r-full bg-gradient-to-r from-[var(--cares-primary)] to-green-700 pr-7 pl-6 text-[28px] leading-none font-bold tracking-wide text-white tabular-nums shadow-[0_6px_14px_-6px_rgba(20,83,45,0.6)] transition-[filter] duration-[400ms] ease-out group-hover:brightness-110`}
      >
        {padNumber(number)}
      </span>
      <span className="absolute top-full left-0 h-2.5 w-3 bg-green-950 [clip-path:polygon(0_0,100%_0,100%_100%)]" />
    </div>
  )
}

function ObjectiveCard({ number, children }: { number: number; children: ReactNode }) {
  return (
    <article className={`${OBJECTIVE_CARD} ${OBJECTIVE_HOVER}`}>
      <GlassSheen ripples cream />
      {/* On hover or tap, the same brighter mint wash as the A, B and C parts fades in. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 rounded-[inherit] bg-gradient-to-br from-emerald-100 to-emerald-200/70 opacity-0 transition-opacity duration-[400ms] ease-out group-hover:opacity-100 group-active:opacity-100"
      />
      <NumberRibbon number={number} />
      <p className={OBJECTIVE_TEXT}>
        {children}
      </p>
    </article>
  )
}

/** The last objective, full width: its lead-in beside the three lettered parts. The
 *  panel fades up first; A, B and C then follow it in, one after another. */
function OpportunitiesCard({ number }: { number: number }) {
  return (
    <article className={`group ${OBJECTIVE_CARD} flex-col gap-6 lg:flex-row lg:items-center lg:gap-8`}>
      <GlassSheen ripples cream />
      <NumberRibbon number={number} />
      <div className="lg:w-[28%] lg:shrink-0">
        {/* Set in the org chart's "Organizational Chart" style, heavy slab italic, but in
            black. */}
        <p
          className={`${LANDING_SLAB} pr-1 text-2xl leading-tight font-extrabold text-balance text-black italic sm:text-[1.75rem]`}
        >
          {LANDING_OPPORTUNITIES_OBJECTIVE}
        </p>
      </div>
      <ul className="grid flex-1 gap-3 sm:grid-cols-3 sm:gap-4">
        {LANDING_OPPORTUNITIES.map((item, index) => (
          <LandingReveal key={item} as="li" index={index + 2} staggerMs={stagger} className="h-full">
            <div className={OPPORTUNITY_CARD}>
              <GlassSheen cream />
              <span
                aria-hidden
                className="absolute inset-0 -z-10 bg-gradient-to-br from-emerald-100 to-emerald-200/70 opacity-0 transition-opacity duration-[400ms] ease-out group-hover/part:opacity-100 group-active/part:opacity-100"
              />
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--cares-primary-hover)] text-sm font-bold text-white">
                {String.fromCharCode(65 + index)}
              </span>
              <span className={OBJECTIVE_TEXT}>
                {item}
              </span>
            </div>
          </LandingReveal>
        ))}
      </ul>
    </article>
  )
}

/** Objectives 01–03 three across from lg (two plus a full-width third below that),
 *  then 04 full width. */
export function LandingAboutObjectives() {
  return (
    <>
      <ol className="grid gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
        {LANDING_OBJECTIVES.map((objective, index) => (
          <LandingReveal
            key={objective}
            as="li"
            index={index}
            staggerMs={stagger}
            className={cn(
              'h-full',
              index === LANDING_OBJECTIVES.length - 1 && 'sm:col-span-2 lg:col-span-1',
            )}
          >
            <ObjectiveCard number={index + 1}>{objective}</ObjectiveCard>
          </LandingReveal>
        ))}
      </ol>
      <LandingReveal className="mt-5 sm:mt-6">
        <OpportunitiesCard number={LANDING_OBJECTIVES.length + 1} />
      </LandingReveal>
    </>
  )
}
