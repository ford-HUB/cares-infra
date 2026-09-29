import type { ReactNode } from 'react'
import { RANK_FRAME_FALLBACK } from '../../../constants/rank-frames'
import type { RankFrameDesignId } from '../../../types/ranking'

interface FrameArtProps {
  /** `url(#…)` gradient painted by the tier's two colours. */
  fill: string
  /** Soft outer halo, drawn only where a design wants one. */
  glow: string
  /** False in table rows: ornaments outside the ring are dropped, rings stay. */
  detailed: boolean
}

/** Eight spikes around the ring — the ornament that reads as a rank badge. */
const SPIKE_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315]

/** A laurel branch is leaves stepped along one side's arc. */
const LAUREL_ANGLES = [18, 40, 62, 84, 106, 128]

/** Markers riding the orbit ring. */
const ORBIT_ANGLES = [0, 120, 240]

/** Rivet positions around the hex plate. */
const SHIELD_ANGLES = [30, 90, 150, 210, 270, 330]

/** Five points, star-spaced. */
const STAR_ANGLES = [0, 72, 144, 216, 288]

/** Eight petals, one per compass point. */
const PETAL_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315]

/** Twelve cog teeth. */
const GEAR_ANGLES = Array.from({ length: 12 }, (_, index) => index * 30)

/** The three tongues of the flame crest, centre one upright. */
const FLAME_ANGLES = [-32, 0, 32]

/** Corner gems on the tilted facet. */
const PRISM_ANGLES = [45, 135, 225, 315]

function Aurora({ fill, glow, detailed }: FrameArtProps) {
  return (
    <>
      <circle cx="50" cy="50" r="49" fill={glow} />
      <circle cx="50" cy="50" r="43" fill="none" stroke={fill} strokeWidth="5" />
      <circle
        cx="50"
        cy="50"
        r="36"
        fill="none"
        stroke={fill}
        strokeWidth="1.5"
        opacity="0.55"
      />

      {SPIKE_ANGLES.map((angle) => (
        <path
          key={angle}
          d="M50 0 L55 11 L50 8 L45 11 Z"
          fill={fill}
          transform={`rotate(${angle} 50 50)`}
        />
      ))}

      {detailed && (
        <>
          {/* Wings sweeping out of the ring, and a crown gem at the top. */}
          <path
            d="M8 50 C8 30, 22 16, 40 14 C26 22, 18 34, 18 50 Z"
            fill={fill}
            opacity="0.9"
          />
          <path
            d="M92 50 C92 30, 78 16, 60 14 C74 22, 82 34, 82 50 Z"
            fill={fill}
            opacity="0.9"
          />
          <path d="M50 -8 L58 4 L50 12 L42 4 Z" fill={fill} stroke="white" strokeWidth="1" />
        </>
      )}
    </>
  )
}

function Laurel({ fill, glow, detailed }: FrameArtProps) {
  return (
    <>
      <circle cx="50" cy="50" r="49" fill={glow} />
      <circle
        cx="50"
        cy="50"
        r="41"
        fill="none"
        stroke={fill}
        strokeWidth="2.5"
        opacity="0.5"
      />
      <circle cx="50" cy="50" r="36" fill="none" stroke={fill} strokeWidth="4" />

      {detailed &&
        LAUREL_ANGLES.map((angle) => (
          // Each leaf is mirrored onto the far branch, so the wreath stays even.
          <g key={angle}>
            <ellipse
              cx="50"
              cy="6"
              rx="4.5"
              ry="9"
              fill={fill}
              opacity="0.9"
              transform={`rotate(${180 - angle} 50 50) rotate(-20 50 6)`}
            />
            <ellipse
              cx="50"
              cy="6"
              rx="4.5"
              ry="9"
              fill={fill}
              opacity="0.9"
              transform={`rotate(${180 + angle} 50 50) rotate(20 50 6)`}
            />
          </g>
        ))}

      {detailed && <circle cx="50" cy="4" r="4" fill={fill} stroke="white" strokeWidth="1" />}
    </>
  )
}

function Shield({ fill, glow, detailed }: FrameArtProps) {
  return (
    <>
      <circle cx="50" cy="50" r="49" fill={glow} />
      {detailed && (
        <path
          d="M50 2 L93 26 L93 74 L50 98 L7 74 L7 26 Z"
          fill="none"
          stroke={fill}
          strokeWidth="5"
          strokeLinejoin="round"
        />
      )}
      <circle cx="50" cy="50" r="40" fill="none" stroke={fill} strokeWidth="4" />
      <circle
        cx="50"
        cy="50"
        r="34"
        fill="none"
        stroke={fill}
        strokeWidth="1.5"
        opacity="0.5"
      />

      {SHIELD_ANGLES.map((angle) => (
        <circle
          key={angle}
          cx="50"
          cy="10"
          r="3"
          fill={fill}
          transform={`rotate(${angle} 50 50)`}
        />
      ))}
    </>
  )
}

function Orbit({ fill, glow, detailed }: FrameArtProps) {
  return (
    <>
      <circle cx="50" cy="50" r="49" fill={glow} />
      {/* Two open arcs rather than a closed band — the gaps make it read as motion. */}
      <path
        d="M50 8 A42 42 0 0 1 92 50"
        fill="none"
        stroke={fill}
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M50 92 A42 42 0 0 1 8 50"
        fill="none"
        stroke={fill}
        strokeWidth="5"
        strokeLinecap="round"
      />
      <circle
        cx="50"
        cy="50"
        r="36"
        fill="none"
        stroke={fill}
        strokeWidth="2"
        opacity="0.6"
      />

      {detailed &&
        ORBIT_ANGLES.map((angle) => (
          <circle
            key={angle}
            cx="50"
            cy="8"
            r="4.5"
            fill={fill}
            stroke="white"
            strokeWidth="1"
            transform={`rotate(${angle} 50 50)`}
          />
        ))}
    </>
  )
}

function Crown({ fill, glow, detailed }: FrameArtProps) {
  return (
    <>
      <circle cx="50" cy="50" r="49" fill={glow} />
      <circle cx="50" cy="50" r="41" fill="none" stroke={fill} strokeWidth="5" />
      <circle
        cx="50"
        cy="50"
        r="34"
        fill="none"
        stroke={fill}
        strokeWidth="1.5"
        opacity="0.5"
      />

      {detailed && (
        <>
          {/* Three-point crown resting on the ring, ribbon tails hanging below. */}
          <path
            d="M26 14 L36 -2 L50 10 L64 -2 L74 14 L64 20 L36 20 Z"
            fill={fill}
            stroke="white"
            strokeWidth="1"
            strokeLinejoin="round"
          />
          <circle cx="36" cy="-2" r="3.5" fill={fill} stroke="white" strokeWidth="1" />
          <circle cx="64" cy="-2" r="3.5" fill={fill} stroke="white" strokeWidth="1" />
          <path d="M34 84 L28 104 L42 96 Z" fill={fill} opacity="0.9" />
          <path d="M66 84 L72 104 L58 96 Z" fill={fill} opacity="0.9" />
        </>
      )}
    </>
  )
}


function Starburst({ fill, glow, detailed }: FrameArtProps) {
  return (
    <>
      <circle cx="50" cy="50" r="49" fill={glow} />

      {detailed &&
        STAR_ANGLES.map((angle) => (
          // Long points sit behind the band, so the ring still reads as a ring.
          <path
            key={angle}
            d="M50 -12 L59 26 L50 34 L41 26 Z"
            fill={fill}
            opacity="0.85"
            transform={`rotate(${angle} 50 50)`}
          />
        ))}

      <circle cx="50" cy="50" r="40" fill="none" stroke={fill} strokeWidth="5" />
      <circle
        cx="50"
        cy="50"
        r="33"
        fill="none"
        stroke={fill}
        strokeWidth="1.5"
        opacity="0.5"
      />
    </>
  )
}

function Blossom({ fill, glow, detailed }: FrameArtProps) {
  return (
    <>
      <circle cx="50" cy="50" r="49" fill={glow} />

      {detailed &&
        PETAL_ANGLES.map((angle) => (
          <path
            key={angle}
            d="M50 2 C60 12, 60 24, 50 30 C40 24, 40 12, 50 2 Z"
            fill={fill}
            opacity="0.85"
            transform={`rotate(${angle} 50 50)`}
          />
        ))}

      <circle cx="50" cy="50" r="37" fill="none" stroke={fill} strokeWidth="4.5" />
      <circle
        cx="50"
        cy="50"
        r="31"
        fill="none"
        stroke={fill}
        strokeWidth="1.5"
        opacity="0.45"
      />
    </>
  )
}

function Gear({ fill, glow, detailed }: FrameArtProps) {
  return (
    <>
      <circle cx="50" cy="50" r="49" fill={glow} />

      {detailed &&
        GEAR_ANGLES.map((angle) => (
          <rect
            key={angle}
            x="45"
            y="2"
            width="10"
            height="12"
            rx="2"
            fill={fill}
            transform={`rotate(${angle} 50 50)`}
          />
        ))}

      <circle cx="50" cy="50" r="41" fill="none" stroke={fill} strokeWidth="6" />
      <circle
        cx="50"
        cy="50"
        r="33"
        fill="none"
        stroke={fill}
        strokeWidth="2"
        strokeDasharray="4 5"
        opacity="0.6"
      />
    </>
  )
}

function Flame({ fill, glow, detailed }: FrameArtProps) {
  return (
    <>
      <circle cx="50" cy="50" r="49" fill={glow} />
      <circle cx="50" cy="50" r="40" fill="none" stroke={fill} strokeWidth="5" />
      <circle
        cx="50"
        cy="50"
        r="33"
        fill="none"
        stroke={fill}
        strokeWidth="1.5"
        opacity="0.5"
      />

      {detailed &&
        FLAME_ANGLES.map((angle) => (
          // Each tongue leans out from the top of the band.
          <path
            key={angle}
            d="M50 -10 C58 2, 58 10, 50 16 C42 10, 42 2, 50 -10 Z"
            fill={fill}
            opacity={angle === 0 ? '1' : '0.8'}
            transform={`rotate(${angle} 50 50)`}
          />
        ))}

      {detailed && <path d="M40 88 L50 98 L60 88 Z" fill={fill} opacity="0.8" />}
    </>
  )
}

function Prism({ fill, glow, detailed }: FrameArtProps) {
  return (
    <>
      <circle cx="50" cy="49" r="49" fill={glow} />
      {detailed && (
        <rect
          x="16"
          y="16"
          width="68"
          height="68"
          rx="6"
          fill="none"
          stroke={fill}
          strokeWidth="4.5"
          transform="rotate(45 50 50)"
        />
      )}
      <circle cx="50" cy="50" r="37" fill="none" stroke={fill} strokeWidth="4.5" />

      {detailed &&
        PRISM_ANGLES.map((angle) => (
          <rect
            key={angle}
            x="45"
            y="-4"
            width="10"
            height="10"
            rx="1.5"
            fill={fill}
            stroke="white"
            strokeWidth="1"
            transform={`rotate(${angle} 50 50) rotate(45 50 1)`}
          />
        ))}
    </>
  )
}

function Halo({ fill, glow, detailed }: FrameArtProps) {
  return (
    <>
      <circle cx="50" cy="50" r="49" fill={glow} />
      {detailed && (
        <>
          {/* The halo floats clear of the band rather than touching it. */}
          <ellipse
            cx="50"
            cy="2"
            rx="26"
            ry="7"
            fill="none"
            stroke={fill}
            strokeWidth="4"
          />
          <path
            d="M12 62 A40 40 0 0 0 24 78"
            fill="none"
            stroke={fill}
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.7"
          />
          <path
            d="M88 62 A40 40 0 0 1 76 78"
            fill="none"
            stroke={fill}
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.7"
          />
        </>
      )}
      <circle cx="50" cy="50" r="40" fill="none" stroke={fill} strokeWidth="3" />
      <circle
        cx="50"
        cy="50"
        r="34"
        fill="none"
        stroke={fill}
        strokeWidth="1.5"
        opacity="0.45"
      />
    </>
  )
}

function Ring({ fill, glow }: FrameArtProps) {
  return (
    <>
      <circle cx="50" cy="50" r="49" fill={glow} />
      <circle cx="50" cy="50" r="42" fill="none" stroke={fill} strokeWidth="5" />
      <circle
        cx="50"
        cy="50"
        r="35"
        fill="none"
        stroke={fill}
        strokeWidth="1.5"
        opacity="0.45"
      />
      <circle cx="50" cy="8" r="3.5" fill={fill} stroke="white" strokeWidth="1" />
    </>
  )
}

/**
 * The ornament half of a rank badge, one function per design. Colour never appears
 * here — every shape paints with the gradient handed in, so a director recolouring a
 * tier restyles all six designs at once.
 */
const FRAME_ART: Record<RankFrameDesignId, (props: FrameArtProps) => ReactNode> = {
  aurora: Aurora,
  laurel: Laurel,
  shield: Shield,
  orbit: Orbit,
  crown: Crown,
  starburst: Starburst,
  blossom: Blossom,
  gear: Gear,
  flame: Flame,
  prism: Prism,
  halo: Halo,
  ring: Ring,
}

interface RankFrameArtProps extends FrameArtProps {
  design: RankFrameDesignId
}

export function RankFrameArt({ design, ...props }: RankFrameArtProps) {
  const Art = FRAME_ART[design] ?? FRAME_ART[RANK_FRAME_FALLBACK]
  return <Art {...props} />
}
