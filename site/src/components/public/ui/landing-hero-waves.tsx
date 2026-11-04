/* Colours for the hero's bottom waves: CARES greens from a lit emerald down to deep
 * forest, and a pale gold for the hairlines along the crests. */
const EMERALD_LIGHT = '#2a9d5c'
const EMERALD = '#16733f'
const FOREST = '#0b4a29'
const FOREST_DEEP = '#063a20'
const GOLD = '#ecd08a'
const GOLD_BRIGHT = '#fff1c7'

const HAIRLINE = { fill: 'none', vectorEffect: 'non-scaling-stroke' } as const

/** Layered green waves along the hero's bottom edge: a lighter band sweeping down from
 *  the left, a deep wave rising to the right, and a bright emerald swell in the right
 *  corner. Fine gold lines trace the two crests, with a soft glint near the right. */
export function LandingHeroWaves() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 1440 120"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-x-0 bottom-0 h-24 w-full sm:h-32"
    >
      <defs>
        <linearGradient id="hero-wave-left" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={EMERALD_LIGHT} stopOpacity={0.75} />
          <stop offset="1" stopColor={FOREST} stopOpacity={0.95} />
        </linearGradient>
        <linearGradient id="hero-wave-middle" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={FOREST} />
          <stop offset="0.6" stopColor={FOREST_DEEP} />
          <stop offset="1" stopColor={FOREST} />
        </linearGradient>
        <linearGradient id="hero-wave-right" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={EMERALD_LIGHT} />
          <stop offset="0.55" stopColor={EMERALD} />
          <stop offset="1" stopColor={FOREST_DEEP} />
        </linearGradient>
        {/* Gold that fades in from nothing, so neither line starts with a hard tip. */}
        <linearGradient id="hero-wave-gold" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={GOLD} stopOpacity={0} />
          <stop offset="0.25" stopColor={GOLD} stopOpacity={0.8} />
          <stop offset="0.8" stopColor={GOLD_BRIGHT} />
          <stop offset="1" stopColor={GOLD} stopOpacity={0.7} />
        </linearGradient>
        <radialGradient id="hero-wave-glint">
          <stop offset="0" stopColor={GOLD_BRIGHT} stopOpacity={0.95} />
          <stop offset="1" stopColor={GOLD} stopOpacity={0} />
        </radialGradient>
      </defs>

      {/* Lighter band sweeping down from the top-left corner and running out flat. */}
      <path
        d="M0 4 C150 52 300 84 470 88 C700 93 1000 100 1440 104 V120 H0 Z"
        fill="url(#hero-wave-left)"
      />
      {/* Deep wave rising toward the right edge. */}
      <path
        d="M0 120 V113 C400 104 800 72 1180 58 C1300 51 1380 30 1440 16 V120 Z"
        fill="url(#hero-wave-middle)"
      />
      {/* Bright emerald swell in the bottom-right corner. */}
      <path d="M800 120 C1050 92 1250 72 1440 34 V120 Z" fill="url(#hero-wave-right)" />

      {/* Gold hairlines along the two crests, and the glint where the light catches. */}
      <path
        d="M380 86 C700 72 950 62 1180 58 C1300 51 1380 30 1440 16"
        stroke="url(#hero-wave-gold)"
        strokeWidth={1.25}
        {...HAIRLINE}
      />
      <path
        d="M800 120 C1050 92 1250 72 1440 34"
        stroke="url(#hero-wave-gold)"
        strokeWidth={1}
        {...HAIRLINE}
      />
      <ellipse cx={1300} cy={48} rx={70} ry={4} fill="url(#hero-wave-glint)" />
    </svg>
  )
}
