import { ArrowRight, Check, ChevronDown } from 'lucide-react'
import { Link } from 'react-router-dom'
import { LOGIN_PATH, REQUEST_ACCESS_PATH } from '../../constants/routes'
import { LANDING_TRUST_POINTS } from '../../constants/landing'
import { useRotatingIndex } from '../../hooks/use-rotating-index'
import {
  // LANDING_BULLETIN,
  LANDING_HERO_BACKGROUNDS,
  LANDING_MOTION,
  LANDING_SECTION_IDS,
  LANDING_SERIF,
} from '../../constants/landing-bulletin'
import { LandingHexMosaic } from './ui/landing-hex-mosaic'

/** Entrance for the hero's stacked lines: each step starts a beat after the last. */
const ENTER =
  'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:fill-mode-both motion-safe:duration-700'
const step = (n: number) => ({
  animationDelay: `${n * LANDING_MOTION.heroStepMs}ms`,
})

export function LandingHero() {
  const activePhoto = useRotatingIndex(LANDING_HERO_BACKGROUNDS.length, LANDING_MOTION.heroSlideMs)

  return (
    <section className="relative overflow-hidden bg-gradient-to-r from-[var(--cares-primary)] to-[var(--cares-primary-hover)] text-white">
      {/* Photos crossfade underneath, tinted CARES green so the copy stays legible:
          solid behind the text on the left, thinning toward the mosaic. */}
      {/* The wrapper fades the photos in from the solid colour on first load; the
          images keep their own zoom animation, so the fade can't sit on them. */}
      <div
        aria-hidden
        style={{ animationDuration: `${LANDING_MOTION.heroIntroFadeMs}ms` }}
        className="pointer-events-none absolute inset-0 motion-safe:animate-in motion-safe:fade-in motion-safe:fill-mode-both motion-safe:ease-out"
      >
        {LANDING_HERO_BACKGROUNDS.map((photo, index) => (
          <img
            key={photo}
            src={photo}
            alt=""
            loading={index === 0 ? 'eager' : 'lazy'}
            style={{ transitionDuration: `${LANDING_MOTION.heroFadeMs}ms` }}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity ease-in-out motion-safe:animate-landing-kenburns ${index === activePhoto ? 'opacity-100' : 'opacity-0'}`}
          />
        ))}
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[var(--cares-primary)] via-[var(--cares-primary-hover)]/85 to-[var(--cares-primary-hover)]/0"
      />
      {/* Bottom fade repeats the horizontal gradient, masked to fade upward, so the
          edge doesn't flatten into a single colour band. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-r from-[var(--cares-primary)] to-[var(--cares-primary-hover)] [mask-image:linear-gradient(to_top,black,transparent)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -right-32 h-[28rem] w-[28rem] rounded-full bg-[var(--cares-primary-hover)] opacity-40 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-48 -left-40 h-[26rem] w-[26rem] rounded-full bg-emerald-400 opacity-10 blur-3xl"
      />

      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-5 pt-14 pb-24 sm:px-8 sm:pt-20 sm:pb-28 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="min-w-0">
          <p
            className={`${ENTER} flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium tracking-[0.2em] text-white/70 uppercase`}
            style={step(0)}
          >
            {/* <span>{LANDING_BULLETIN.schoolYear}</span> */}
            {/* <span aria-hidden className="h-3 w-px bg-white/30" /> */}
            {/* <span>{LANDING_BULLETIN.issn}</span> */}
          </p>

          <h1
            className={`${LANDING_SERIF} ${ENTER} mt-5 text-4xl leading-[1.15] text-balance sm:text-5xl`}
            style={step(1)}
          >
            Giving hope,
            <br />
            <span className="bg-gradient-to-r from-emerald-200 via-white to-emerald-300 bg-[length:200%_auto] bg-clip-text text-transparent italic motion-safe:animate-landing-shimmer">
              transforming lives.
            </span>
          </h1>

          <p
            className={`${ENTER} mt-4 text-[13px] font-semibold tracking-[0.12em] text-emerald-200 uppercase`}
            style={step(2)}
          >
            Community Awareness, Relations and Extension Services
          </p>

          <p
            className={`${ENTER} mt-5 max-w-xl text-[15px] leading-relaxed text-pretty text-white/80`}
            style={step(3)}
          >
           <strong className="font-semibold text-white text-lg">CARES</strong> {' '}
            Connects volunteers, empowering communities, and managing meaningful extension
            programs to create lasting positive impact through technology and collaboration.
            
          </p>

          <div className={`${ENTER} mt-8 flex flex-wrap items-center gap-3`} style={step(4)}>
            <Link
              to={LOGIN_PATH}
              className="group inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-[var(--cares-primary)] shadow-lg shadow-black/10 transition-colors hover:bg-emerald-50 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--cares-primary)] focus-visible:outline-none"
            >
              Sign in to the portal
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
            <Link
              to={REQUEST_ACCESS_PATH}
              className="inline-flex items-center rounded-lg border border-white/30 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:border-white/60 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
            >
              Request administrator access
            </Link>
          </div>

          <ul className={`${ENTER} mt-8 flex flex-col gap-1.5`} style={step(5)}>
            {LANDING_TRUST_POINTS.map((point) => (
              <li key={point} className="flex items-start gap-2 text-[12px] text-white/65">
                <Check className="mt-[3px] h-3.5 w-3.5 shrink-0 text-emerald-300" />
                {point}
              </li>
            ))}
          </ul>
        </div>

        <div className="w-full min-w-0 max-w-sm justify-self-center sm:max-w-md lg:max-w-none">
          <LandingHexMosaic />
        </div>
      </div>

      <a
        href={`#${LANDING_SECTION_IDS.homeStats}`}
        aria-label="Scroll to the figures"
        className="absolute bottom-16 left-1/2 hidden -translate-x-1/2 rounded-full p-1 text-white/50 transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none lg:block"
      >
        <ChevronDown className="h-5 w-5 motion-safe:animate-bounce" />
      </a>
    </section>
  )
}
