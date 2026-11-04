import type { CSSProperties } from 'react'
import {
  LANDING_BANNER_SERIF,
  LANDING_CONTAINER,
  LANDING_MOTION,
  LANDING_SLAB,
} from '../../constants/landing-bulletin'
import { LANDING_DIRECTOR_MESSAGE } from '../../constants/landing-director-message'
import { useScrollUnfurl } from '../../hooks/use-scroll-unfurl'
import { LandingHillsBackdrop } from './ui/landing-about-botanicals'
import { LandingEyebrowHeading } from './ui/landing-eyebrow-heading'
import { GlassSheen } from './ui/landing-glass-sheen'
import { LandingReveal } from './ui/landing-reveal'

/* The scroll's wavy left and right edges, cut with a mask: a wave strip repeats down
 * each side and a plain block fills the middle. */
const WAVE_LEFT =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='56'%3E%3Cpath d='M16 0H8Q-2 14 8 28Q18 42 8 56H16Z'/%3E%3C/svg%3E\")"
const WAVE_RIGHT =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='56'%3E%3Cpath d='M0 0H8Q18 14 8 28Q-2 42 8 56H0Z'/%3E%3C/svg%3E\")"
const WAVY_EDGES: CSSProperties = {
  maskImage: `${WAVE_LEFT}, ${WAVE_RIGHT}, linear-gradient(#000, #000)`,
  maskSize: '16px 56px, 16px 56px, calc(100% - 32px) 100%',
  maskPosition: 'left top, right top, center',
  maskRepeat: 'repeat-y, repeat-y, no-repeat',
  WebkitMaskImage: `${WAVE_LEFT}, ${WAVE_RIGHT}, linear-gradient(#000, #000)`,
  WebkitMaskSize: '16px 56px, 16px 56px, calc(100% - 32px) 100%',
  WebkitMaskPosition: 'left top, right top, center',
  WebkitMaskRepeat: 'repeat-y, repeat-y, no-repeat',
}

/* The roll: the sheet's own mint glass wound into a cylinder, shaded light on top and
 * deeper underneath, with a thin green edge. */
const ROLL_BODY =
  'bg-[linear-gradient(180deg,#c8f5dc_0%,#f4fff9_18%,#b6efcf_45%,#86dcae_75%,#5fc792_100%)] ring-[1.5px] ring-green-600/45'

/** The roll's end seen face-on: a mint glass disc with the paper's turns drawn as a
 *  spiral running out from the core. */
function RollSpiral({ side }: { side: 'left' | 'right' }) {
  return (
    <svg
      viewBox="0 0 84 80"
      className={`absolute top-1/2 h-20 w-21 -translate-y-1/2 drop-shadow-md sm:h-24 sm:w-25 ${side === 'left' ? '-left-2' : '-right-2'}`}
    >
      <defs>
        <radialGradient id="scroll-roll-end" cx="0.4" cy="0.35" r="0.75">
          <stop offset="0" stopColor="#f4fff9" />
          <stop offset="0.55" stopColor="#b6efcf" />
          <stop offset="1" stopColor="#6fd09e" />
        </radialGradient>
      </defs>
      <circle cx={42} cy={40} r={36} fill="url(#scroll-roll-end)" className="stroke-green-600/60" strokeWidth={2} />
      <path
        d="M40 40a3 3 0 0 1 6 0a6 6 0 0 1-12 0a9 9 0 0 1 18 0a12 12 0 0 1-24 0a15 15 0 0 1 30 0a18 18 0 0 1-36 0a21 21 0 0 1 42 0a24 24 0 0 1-48 0"
        fill="none"
        className="stroke-green-700"
        strokeWidth={3}
        strokeLinecap="round"
      />
      <ellipse cx={32} cy={20} rx={12} ry={4} fill="white" opacity={0.55} />
    </svg>
  )
}

/** One end of the scroll: the letter rolled into a glossy mint cylinder, its spiral curl
 *  showing at one end (`side`) and a soft glint along the top. */
function ScrollRoller({ side }: { side: 'left' | 'right' }) {
  return (
    <div aria-hidden className="relative z-10 h-16 sm:h-20">
      <span
        className={`absolute inset-y-0 rounded-full ${ROLL_BODY} shadow-[0_12px_20px_-12px_rgba(21,83,45,0.6)] ${side === 'left' ? 'right-0 left-6' : 'right-6 left-0'}`}
      >
        <span className="absolute inset-x-16 top-2 h-2.5 rounded-full bg-white/70 blur-[1px]" />
      </span>
      <RollSpiral side={side} />
    </div>
  )
}

/** Title block: a green bar beside "A Message from the / Director / UCLM CARES", a rule
 *  with a heavier centre, then the greeting on a mint glass pill. */
function MessageHeading() {
  const { heading, greeting } = LANDING_DIRECTOR_MESSAGE

  return (
    <div>
      <div className="flex gap-4">
        <span aria-hidden className="w-1.5 shrink-0 rounded-full bg-green-700" />
        <h2 className="text-[var(--cares-primary)]">
          <span className={`${LANDING_BANNER_SERIF} block text-2xl font-semibold sm:text-3xl`}>
            {heading.lead}
          </span>
          <span
            className={`${LANDING_SLAB} block pr-2 text-5xl leading-none font-extrabold text-green-700 italic sm:text-6xl`}
          >
            {heading.title}
          </span>
          <span
            className={`${LANDING_BANNER_SERIF} mt-1 block text-lg font-semibold tracking-[0.3em] uppercase sm:text-xl`}
          >
            {heading.office}
          </span>
        </h2>
      </div>
      <div aria-hidden className="relative mt-5 h-px bg-green-700/60">
        <span className="absolute top-1/2 left-1/2 h-1.5 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full bg-green-700" />
      </div>
      <p className="relative isolate mt-6 inline-flex items-center gap-3 overflow-hidden rounded-full border border-white/80 bg-gradient-to-b from-emerald-100 to-emerald-200/80 px-5 py-2 shadow-[0_8px_18px_-10px_rgba(21,128,61,0.55),inset_0_1px_0_rgba(255,255,255,0.95)] ring-1 ring-emerald-600/25">
        <span aria-hidden className={`${LANDING_SLAB} text-4xl leading-[0.6] font-extrabold text-green-700`}>
          “
        </span>
        <span aria-hidden className="h-6 w-0.5 rounded-full bg-green-700/60" />
        <span
          className={`${LANDING_BANNER_SERIF} text-base font-bold text-[var(--cares-primary)] italic sm:text-lg`}
        >
          {greeting}
        </span>
      </p>
    </div>
  )
}

/* Unrolling: the sheet is uncovered top to bottom while the bottom roller travels down
 * with its edge. The clip leaves 48px of slack at the sides and foot for the shadow. */
const UNFURL_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'
const SHEET_CLOSED = 'inset(-48px -48px 100% -48px)'
const SHEET_OPEN = 'inset(-48px -48px -48px -48px)'
/** The sheet tucks 16px under each roller (the -my-4 below), so closed, the bottom
 *  roller rises by the sheet's height less those two overlaps. */
const ROLLER_OVERLAP_PX = 32

/* After unrolling, a band of light crosses the glass once. */
const GLASS_SWEEP =
  'bg-[linear-gradient(110deg,transparent_35%,rgba(255,255,255,0.5)_50%,transparent_65%)] bg-[length:250%_100%] bg-no-repeat'

/** The director's message, the last part of the About section: a green glass scroll
 *  hung between two rollers, with the title and portrait at the top, the letter beneath,
 *  and the director's name on a dark-green plate to sign it off. On first view it
 *  unrolls downward, its contents fade up in turn, and a reflection crosses it once. */
export function LandingDirectorMessage() {
  const { section, salutation, paragraphs, closing, name, photo, signatureRole } =
    LANDING_DIRECTOR_MESSAGE
  const { triggerRef, sheetRef, open, sheetHeight, animate } = useScrollUnfurl<HTMLDivElement>()
  const { unfurlMs, unfurlContentStartMs, unfurlContentStepMs } = LANDING_MOTION

  /* Fade-up for the n-th piece of the letter, in reading order. */
  const reveal = (step: number) => ({
    className: open ? 'motion-safe:animate-landing-soft-rise' : 'motion-safe:opacity-0',
    style: { animationDelay: `${unfurlContentStartMs + step * unfurlContentStepMs}ms` },
  })
  const transition = (property: string) =>
    animate ? `${property} ${unfurlMs}ms ${UNFURL_EASE}` : undefined
  const signatureStep = paragraphs.length + 4

  return (
    <section className="relative overflow-clip">
      <LandingHillsBackdrop />
      <div className={`${LANDING_CONTAINER} relative pt-4 pb-40 sm:pb-44`}>
        <LandingReveal className="mx-auto mb-12 max-w-2xl text-center">
          <LandingEyebrowHeading title={section.title} description={section.description} />
        </LandingReveal>

        <div ref={triggerRef} className="mx-auto max-w-4xl">
          <ScrollRoller side="left" />
          <div
            ref={sheetRef}
            style={{
              clipPath: open ? SHEET_OPEN : SHEET_CLOSED,
              transition: transition('clip-path'),
            }}
            className="-my-4 mx-6 drop-shadow-[0_14px_22px_rgba(21,83,45,0.22)] sm:mx-10"
          >
            <article
              style={WAVY_EDGES}
              className="relative isolate bg-gradient-to-b from-emerald-50 via-green-100 to-green-200 px-9 pt-14 pb-12 sm:px-14 sm:pt-16"
            >
              <GlassSheen ripples />
              {/* Where the sheet runs under each roll, the roll casts a soft shadow on it. */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-green-900/15 to-transparent"
              />
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-green-900/15 to-transparent"
              />
              <span
                aria-hidden
                style={{ animationDelay: `${unfurlMs}ms` }}
                className={`pointer-events-none absolute inset-0 z-10 ${GLASS_SWEEP} ${open ? 'motion-safe:animate-landing-glass-sweep' : ''}`}
              />

              <div className="grid items-start gap-8 sm:grid-cols-[1fr_auto]">
                <div {...reveal(0)}>
                  <MessageHeading />
                </div>
                <img
                  src={photo}
                  alt={name}
                  loading="lazy"
                  style={reveal(1).style}
                  className={`h-56 w-48 justify-self-center rounded-2xl object-cover object-top shadow-lg ring-4 ring-[var(--cares-primary)] sm:h-64 sm:w-56 ${reveal(1).className}`}
                />
              </div>

              <div
                className={`${LANDING_BANNER_SERIF} mt-8 space-y-4 text-[15px] leading-relaxed text-gray-800 sm:text-base`}
              >
                <p {...reveal(2)} className={`text-pretty ${reveal(2).className}`}>
                  {salutation}
                </p>
                {paragraphs.map((paragraph, index) => (
                  <p
                    key={paragraph.slice(0, 32)}
                    style={reveal(index + 3).style}
                    className={`text-justify ${reveal(index + 3).className}`}
                  >
                    {paragraph}
                  </p>
                ))}
                <p {...reveal(paragraphs.length + 3)}>
                  {closing[0]}
                  <br />
                  {closing[1]}
                </p>
              </div>

              <div
                style={reveal(signatureStep).style}
                className={`mt-12 flex items-center justify-center gap-4 ${reveal(signatureStep).className}`}
              >
                <span aria-hidden className="h-px w-12 bg-green-700/60 sm:w-28" />
                <p
                  className={`${LANDING_BANNER_SERIF} rounded-full bg-[var(--cares-primary)] px-6 py-2 text-center text-lg font-bold text-white shadow-md`}
                >
                  {name}
                </p>
                <span aria-hidden className="h-px w-12 bg-green-700/60 sm:w-28" />
              </div>
              <p
                style={reveal(signatureStep).style}
                className={`${LANDING_BANNER_SERIF} mt-2 text-center text-[var(--cares-heading)] ${reveal(signatureStep).className}`}
              >
                {signatureRole}
              </p>
            </article>
          </div>
          <div
            style={{
              transform: open
                ? 'translateY(0)'
                : `translateY(-${Math.max(sheetHeight - ROLLER_OVERLAP_PX, 0)}px)`,
              transition: transition('transform'),
              visibility: sheetHeight || open ? 'visible' : 'hidden',
            }}
          >
            <ScrollRoller side="right" />
          </div>
        </div>
      </div>
    </section>
  )
}
