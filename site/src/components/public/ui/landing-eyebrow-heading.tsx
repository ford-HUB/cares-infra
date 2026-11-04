import { LANDING_DISPLAY, LANDING_SLAB } from '../../../constants/landing-bulletin'

/* Long eyebrow rules that fade out toward their outer ends. */
const EYEBROW_RULE = 'h-0.5 w-16 rounded-full from-transparent to-[var(--cares-primary)] sm:w-36'

interface LandingEyebrowHeadingProps {
  /** Spaced capitals between rules above the title; left out when not given. */
  eyebrow?: string
  /** The title reads `before accent`; the accent takes a green gradient and a swoosh. */
  title: { readonly before: string; readonly accent: string }
  description: string
  /** Keeps the title on one line from lg up (give the wrapper room for it). */
  singleLine?: boolean
}

/** Centred section heading: a spaced capital eyebrow between long dark-green rules, a
 *  heavy slab italic title whose closing words run dark-to-bright green over a small lime
 *  brush swoosh, and a Montserrat description beneath. */
export function LandingEyebrowHeading({
  eyebrow,
  title,
  description,
  singleLine = false,
}: LandingEyebrowHeadingProps) {
  return (
    <>
      {eyebrow && (
        <p
          className={`${LANDING_DISPLAY} mb-4 flex items-center justify-center gap-4 text-[13px] font-bold tracking-[0.3em] text-[var(--cares-primary)] uppercase sm:text-sm`}
        >
          <span aria-hidden className={`${EYEBROW_RULE} bg-gradient-to-r`} />
          {eyebrow}
          <span aria-hidden className={`${EYEBROW_RULE} bg-gradient-to-l`} />
        </p>
      )}
      <h2
        className={`${LANDING_SLAB} text-4xl leading-tight font-extrabold text-balance text-[var(--cares-primary)] italic sm:text-5xl ${singleLine ? 'lg:whitespace-nowrap' : ''}`}
      >
        {title.before}{' '}
        <span className="relative inline-block bg-gradient-to-r from-green-700 to-green-500 bg-clip-text pr-1 text-transparent">
          {title.accent}
          {/* Small lime brush swoosh under the accent's first letters. */}
          <svg
            aria-hidden
            viewBox="0 0 60 10"
            preserveAspectRatio="none"
            className="absolute -bottom-1 left-[2%] h-2 w-[28%] fill-lime-300/90"
          >
            <path d="M0 6 C14 1 40 0 60 3 C42 3 18 5 2 10 Z" />
          </svg>
        </span>
      </h2>
      <p
        className={`${LANDING_DISPLAY} mx-auto mt-5 max-w-2xl text-[14px] leading-relaxed font-medium text-pretty text-neutral-700 sm:text-[15px]`}
      >
        {description}
      </p>
    </>
  )
}
