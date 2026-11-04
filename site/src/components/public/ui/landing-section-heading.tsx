import {
  LANDING_BANNER_SERIF,
  LANDING_BRUSH_SERIF,
  LANDING_MOTION,
  LANDING_SERIF,
  LANDING_SLAB,
} from '../../../constants/landing-bulletin'
import { useReveal } from '../../../hooks/use-reveal'

/** The title letter by letter: once it scrolls into view each letter fades up 8px, one
 *  after another. Words stay unbreakable so lines still wrap between them, and screen
 *  readers get the plain title from the heading's label. */
function RisingLetters({ text, visible }: { text: string; visible: boolean }) {
  let letterIndex = 0

  return text.split(' ').map((word, wordIndex) => (
    <span key={`${word}-${wordIndex}`}>
      {wordIndex > 0 && ' '}
      <span aria-hidden className="inline-block whitespace-nowrap">
        {[...word].map((letter) => {
          const delay = letterIndex++ * LANDING_MOTION.letterStepMs
          return (
            <span
              key={delay}
              style={{ animationDelay: `${delay}ms` }}
              className={`inline-block ${visible ? 'motion-safe:animate-landing-letter-rise' : 'motion-safe:opacity-0'}`}
            >
              {letter}
            </span>
          )
        })}
      </span>
    </span>
  ))
}

interface LandingSectionHeadingProps {
  title: string
  /** Closing words in green italic after the title. Sets the heading in the bold book
   *  serif in CARES green, with a darker description beneath. */
  accent?: string
  description?: string
  tone?: 'light' | 'dark'
  /** Sits closer to what follows. */
  plain?: boolean
  /** Heavy slab face in CARES green, matching the Home page's headings. */
  slab?: boolean
  /** Reveals the title letter by letter on first scroll into view. */
  risingLetters?: boolean
  /** Soft heavy serif in deep green over a lime brush stroke. */
  brush?: boolean
}

/** A dry lime brush stroke behind the lower half of a title, fading in as it is revealed. */
function BrushStroke({ visible }: { visible: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 300 40"
      preserveAspectRatio="none"
      className={`pointer-events-none absolute -inset-x-[0.35em] bottom-[0.02em] -z-10 h-[0.6em] -rotate-1 motion-safe:transition-opacity motion-safe:duration-700 motion-safe:ease-out ${visible ? 'opacity-100' : 'motion-safe:opacity-0'}`}
    >
      <path
        d="M6 16 C40 9 95 7 150 8 C210 9 262 7 296 11 L298 21 C276 24 244 31 200 32 C150 34 92 33 42 35 C24 36 11 34 2 30 C1 25 3 20 6 16 Z"
        className="fill-lime-300/55"
      />
      <path
        d="M14 22 C70 18 150 19 230 17 C258 16 280 17 292 19 L290 27 C250 29 180 30 110 31 C70 32 34 32 12 30 Z"
        className="fill-lime-200/70"
      />
    </svg>
  )
}

/** Centred, bold section title with an optional description. */
export function LandingSectionHeading({
  title,
  accent,
  description,
  tone = 'light',
  plain = false,
  slab = false,
  risingLetters = false,
  brush = false,
}: LandingSectionHeadingProps) {
  const { ref, visible } = useReveal<HTMLHeadingElement>(0.6)
  const dark = tone === 'dark'
  const face = brush
    ? `${LANDING_BRUSH_SERIF} text-4xl font-extrabold tracking-tight sm:text-[3.25rem]`
    : slab
    ? `${LANDING_SLAB} text-3xl font-extrabold sm:text-[2.75rem]`
    : accent
      ? `${LANDING_BANNER_SERIF} text-3xl font-bold sm:text-[2.5rem]`
      : `${LANDING_SERIF} text-2xl font-bold sm:text-3xl`
  const colour = dark
    ? 'text-white'
    : brush || slab || accent
      ? 'text-[var(--cares-primary)]'
      : 'text-[var(--cares-heading)]'
  const descriptionColour = dark
    ? 'text-white/70'
    : accent
      ? 'mx-auto max-w-xl font-medium text-neutral-700 sm:text-[15px]'
      : 'text-[var(--cares-muted)]'

  return (
    <div className={`mx-auto max-w-2xl text-center ${plain ? 'mb-4' : 'mb-10'}`}>
      <h2
        ref={ref}
        aria-label={risingLetters ? [title, accent].filter(Boolean).join(' ') : undefined}
        className={`${face} leading-snug text-balance ${colour}`}
      >
        <span className={brush ? 'relative isolate inline-block' : undefined}>
          {brush && <BrushStroke visible={visible} />}
          {risingLetters ? <RisingLetters text={title} visible={visible} /> : title}
        </span>
        {accent && (
          <>
            {' '}
            <em className="bg-gradient-to-r from-green-700 to-green-600 bg-clip-text pr-1 text-transparent italic">
              {accent}
            </em>
          </>
        )}
      </h2>
      {description && (
        <p
          className={`mt-4 text-[14px] leading-relaxed text-pretty ${descriptionColour}`}
        >
          {description}
        </p>
      )}
    </div>
  )
}
