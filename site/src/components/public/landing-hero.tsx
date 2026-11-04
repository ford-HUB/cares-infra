import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AUTH_MODAL_LINK_STATE } from '../../constants/auth-modal'
import { LOGIN_PATH, REQUEST_ACCESS_PATH } from '../../constants/routes'
import { useRotatingIndex } from '../../hooks/use-rotating-index'
import { LandingHeroWaves } from './ui/landing-hero-waves'
import {
  LANDING_CONTAINER,
  LANDING_DISPLAY,
  LANDING_HERO_ACCENT,
  LANDING_HERO_ACCENT_BG,
  LANDING_HERO_BACKGROUNDS,
  LANDING_HERO_HEADLINE,
  LANDING_HERO_TAGLINE,
  LANDING_MOTION,
  LANDING_SERIF,
} from '../../constants/landing-bulletin'

/** Entrance for the hero's stacked lines: each step starts a beat after the last. */
const ENTER =
  'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:fill-mode-both motion-safe:duration-700'
const step = (n: number) => ({
  animationDelay: `${n * LANDING_MOTION.heroStepMs}ms`,
})

export function LandingHero() {
  const activePhoto = useRotatingIndex(LANDING_HERO_BACKGROUNDS.length, LANDING_MOTION.heroSlideMs)

  return (
    // Fills the screen below the sticky header (h-14 plus its 1px border), with the copy
    // centred top to bottom, so no page shows beneath it on first load.
    <section className="relative flex min-h-[calc(100svh/var(--landing-zoom,1)-3.5rem-1px)] flex-col justify-center overflow-hidden bg-gradient-to-r from-[var(--cares-primary)] to-[var(--cares-primary-hover)] text-white">
      {/* Photos crossfade underneath, tinted CARES green so the copy stays legible:
          solid behind the text on the left, thinning toward the right. */}
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
      {/* Layered green waves with gold crest lines along the bottom edge. */}
      <LandingHeroWaves />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -right-32 h-[28rem] w-[28rem] rounded-full bg-[var(--cares-primary-hover)] opacity-40 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-48 -left-40 h-[26rem] w-[26rem] rounded-full bg-emerald-400 opacity-10 blur-3xl"
      />

      <div className={`${LANDING_CONTAINER} relative pt-18 pb-28 sm:pt-20 sm:pb-32`}>
        <div className="max-w-2xl">
          <h1 className={`${ENTER} text-balance`} style={step(0)}>
            <span
              className={`${LANDING_DISPLAY} block text-[min(2.25rem,9vw)] leading-[1.1] font-bold tracking-tight sm:text-5xl`}
            >
              {/* "One" stays white; the word after it (with its punctuation) is cream. */}
              {LANDING_HERO_HEADLINE.map((phrase) => {
                const [lead, ...rest] = phrase.split(' ')
                return (
                  <span key={phrase} className="block">
                    {lead} <span className={LANDING_HERO_ACCENT}>{rest.join(' ')}</span>{' '}
                  </span>
                )
              })}
            </span>
            {/* Tagline on a slanted emerald glass ribbon: a glossy top half, a pale rim,
                gold light along its top and bottom edges, then a cream stripe (the headline's
                key-word colour) and a green one trailing its end. The negative margin cancels
                the padding so the text lines up with the headline. */}
            <span className="relative mt-4 -ml-3 inline-block sm:mt-5 sm:-ml-5 lg:-ml-8">
              <span
                aria-hidden
                className="absolute inset-0 -skew-x-[24deg] overflow-hidden rounded-[4px] border border-emerald-300/40 bg-gradient-to-r from-green-900 via-emerald-600 to-green-800 shadow-[0_12px_28px_-10px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.3),inset_0_-1px_0_rgba(0,0,0,0.35)]"
              >
                <span className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent" />
                <span className="absolute top-0 left-1/2 h-px w-3/5 -translate-x-1/2 bg-gradient-to-r from-transparent via-amber-200 to-transparent" />
                <span className="absolute -top-1 left-1/2 h-2 w-1/4 -translate-x-1/2 rounded-full bg-amber-300/50 blur-md" />
                <span className="absolute bottom-0 left-1/2 h-px w-3/5 -translate-x-1/2 bg-gradient-to-r from-transparent via-amber-300 to-transparent" />
                <span className="absolute -bottom-1.5 left-1/2 h-3 w-1/4 -translate-x-1/2 rounded-full bg-amber-400/60 blur-md" />
              </span>
              <span
                aria-hidden
                className={`absolute inset-y-0 -right-4 w-1.5 -skew-x-[24deg] ${LANDING_HERO_ACCENT_BG} sm:-right-5 sm:w-2`}
              />
              <span
                aria-hidden
                className="absolute inset-y-0 -right-7 w-1 -skew-x-[24deg] bg-gradient-to-b from-emerald-300 to-green-700 sm:-right-9 sm:w-1.5"
              />
              <span
                className={`${LANDING_SERIF} relative block px-3 py-1.5 text-[min(1.5rem,6vw)] leading-[1.25] font-bold whitespace-nowrap text-amber-50 italic [text-shadow:0_2px_6px_rgba(0,0,0,0.4)] sm:px-5 sm:py-2 lg:px-8 sm:text-[2.25rem]`}
              >
                {LANDING_HERO_TAGLINE}
              </span>
            </span>
          </h1>

          {/* The office name, then a short gold rule as wide as the name itself: it runs to
              the final "S" (less the letter-spacing after it). Bright centre, faint glow. */}
          <div className="w-fit max-w-full">
            <p
              className={`${ENTER} mt-5 text-[13px] font-bold tracking-[0.14em] text-white uppercase sm:text-sm`}
              style={step(1)}
            >
              Community Awareness, Relations and Extension Services
            </p>
            <span
              aria-hidden
              className={`${ENTER} mt-5 block h-[3px] w-[calc(100%-0.14em)] rounded-full bg-gradient-to-r from-amber-300/90 via-amber-100 to-amber-300/90 text-[13px] shadow-[0_0_8px_rgba(253,230,138,0.45)] sm:mt-6 sm:text-sm`}
              style={step(1)}
            />
          </div>

          <p
            className={`${ENTER} mt-5 max-w-xl text-base leading-relaxed text-pretty text-white/90 sm:mt-6 sm:text-lg`}
            style={step(2)}
          >
            CARES connects volunteers, programs, and communities{' '}
            <br className="hidden sm:inline" />
            to create meaningful outreach and lasting impact.
          </p>

          <div className={`${ENTER} mt-8 flex flex-wrap items-center gap-3 sm:mt-10`} style={step(3)}>
            <Link
              to={LOGIN_PATH}
              state={AUTH_MODAL_LINK_STATE}
              preventScrollReset
              className="group inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-[var(--cares-primary)] shadow-lg shadow-black/10 transition-colors hover:bg-emerald-50 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--cares-primary)] focus-visible:outline-none"
            >
              Sign in to the portal
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
            <Link
              to={REQUEST_ACCESS_PATH}
              state={AUTH_MODAL_LINK_STATE}
              preventScrollReset
              className="inline-flex items-center rounded-lg border border-white/50 px-6 py-3 text-sm font-semibold text-white transition-colors hover:border-white/80 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
            >
              Request Administrator Access
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
