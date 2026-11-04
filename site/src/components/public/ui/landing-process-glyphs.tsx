import type { LandingProcessGlyph } from '../../../constants/landing-bulletin'

/* Solid two-tone glyphs for the Core Processes cards: the main shapes in mid green, the
 * sleeves and stems in deep CARES green, and fine cut lines in the chip's mint. */
const MAIN = 'fill-green-700'
const DEEP = 'fill-[var(--cares-primary)]'
const CUT = 'stroke-[#d8f1db]'

/* Hover motion for each glyph, driven by the card's `group` hover: the people pulse once,
 * the hands shake once, the sprout grows up from its base and holds while hovered.
 * fill-box makes each group turn and scale about its own shape. */
const PIVOT = '[transform-box:fill-box]'

function PeopleGlyph() {
  return (
    <g className={`${PIVOT} origin-center motion-safe:group-hover:animate-process-pulse`}>
      <circle cx={14} cy={23} r={6.5} className={MAIN} />
      <path d="M2 50c0-8 5-13 12-13 3 0 5.5 1 7.5 2.5C17 43 15 47.5 15 52H2z" className={MAIN} />
      <circle cx={50} cy={23} r={6.5} className={MAIN} />
      <path d="M62 50c0-8-5-13-12-13-3 0-5.5 1-7.5 2.5C47 43 49 47.5 49 52h13z" className={MAIN} />
      <circle cx={32} cy={19} r={9} className={DEEP} />
      <path
        d="M16 54c0-11 7-18.5 16-18.5S48 43 48 54z"
        className={`${DEEP} ${CUT}`}
        strokeWidth={2}
      />
    </g>
  )
}

function HandshakeGlyph() {
  return (
    <>
      <g className="stroke-green-700" strokeWidth={3} strokeLinecap="round">
        <path d="M32 5v7M21 8l3.5 5.5M43 8l-3.5 5.5" />
      </g>
      <g className={`${PIVOT} origin-center motion-safe:group-hover:animate-process-shake`}>
        <path d="M2 27l10-4 7 18-10 4z" className={DEEP} />
      <path d="M62 27l-10-4-7 18 10 4z" className={DEEP} />
      <path
        d="M14 27l6-2.5h9.5L45 39c1.5 1.5 1.5 3.6 0 5-1.4 1.4-3.6 1.4-5 0l1 1c1.4 1.4 1.4 3.6 0 5-1.4 1.4-3.6 1.4-5 0l.5.5c1.2 1.4 1.1 3.5-.3 4.7-1.4 1.2-3.4 1.1-4.6-.2L18.5 42.5z"
        className={MAIN}
      />
      <path
        d="M50 26l-10-4c-3-1-6-.5-8.5 1L23 28.5c-1.5 1-1.5 3 0 4s3.5.8 5-.2l5-3.3L45 39.5z"
        className={`${DEEP} ${CUT}`}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      </g>
    </>
  )
}

function SproutGlyph() {
  return (
    <>
      <g
        className={`${PIVOT} origin-bottom motion-safe:transition-transform motion-safe:duration-[400ms] motion-safe:ease-out motion-safe:group-hover:scale-[1.15]`}
      >
      <path d="M33 43V25" className="stroke-[var(--cares-primary)]" strokeWidth={3} strokeLinecap="round" />
      <path d="M33 31c-7 0-12-5-12-13 8 0 12 5 12 13z" className={MAIN} />
      <path d="M33 27c0-10 6-16 15-16 0 10-6 16-15 16z" className={MAIN} />
      <path d="M24 21l7 7M45 14l-9 9" className={CUT} strokeWidth={1.25} strokeLinecap="round" />
      </g>
      <path d="M3 46l8-3 4.5 14-8 3z" className={DEEP} />
      <path
        d="M13 45.5c3-2 6-2.5 9-1.5l9 2.5h9c2.2 0 4 1.5 4 3.5s-1.8 3.5-4 3.5H30h12l12-6.5c2-1 4.3-.3 5.2 1.5.8 1.7.1 3.6-1.5 4.6L42 61c-2 1-4.2 1.2-6.3.5L17 56z"
        className={DEEP}
      />
    </>
  )
}

const GLYPHS: Record<LandingProcessGlyph, () => React.JSX.Element> = {
  people: PeopleGlyph,
  handshake: HandshakeGlyph,
  sprout: SproutGlyph,
}

/** A core process's solid icon, drawn on a 64-unit square. */
export function LandingProcessGlyphIcon({
  glyph,
  className,
}: {
  glyph: LandingProcessGlyph
  className?: string
}) {
  const Glyph = GLYPHS[glyph]

  return (
    <svg aria-hidden viewBox="0 0 64 64" fill="none" className={className}>
      <Glyph />
    </svg>
  )
}
