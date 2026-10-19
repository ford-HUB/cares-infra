import { LANDING_HEX_PHOTOS, LANDING_MOTION } from '../../../constants/landing-bulletin'

/** Pointy-top hexagon, the shape the CARES bulletin frames its photos in. */
const HEX_CLIP = 'polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)'

/* Honeycomb geometry: 3 hex widths across, 3 rows each stepping 3/4 of a hex
 * height, so the box is 2.5 hex heights tall. Positions are percentages of it. */
const COLUMNS = 3
const ROW_STEP_PCT = 30
const CELL_HEIGHT_PCT = 40
const CELL_INSET_PCT = 0.8

/** Cells pop in one after another, after the hero copy has started. */
const CELL_ENTER =
  'motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-75 motion-safe:fill-mode-both motion-safe:duration-700'
const HERO_LEAD_STEPS = 3

function cellStyle(x: number, y: number, order: number) {
  return {
    left: `${(x / COLUMNS) * 100 + CELL_INSET_PCT}%`,
    top: `${y * ROW_STEP_PCT + CELL_INSET_PCT}%`,
    width: `${100 / COLUMNS - CELL_INSET_PCT * 2}%`,
    height: `${CELL_HEIGHT_PCT - CELL_INSET_PCT * 2}%`,
    clipPath: HEX_CLIP,
    animationDelay: `${(HERO_LEAD_STEPS + order) * LANDING_MOTION.heroStepMs}ms`,
  }
}

export function LandingHexMosaic() {
  return (
    <div className="relative mx-auto aspect-[3/2.887] w-full max-w-md">
      <div
        className={`${CELL_ENTER} absolute flex items-center justify-center bg-white`}
        style={cellStyle(1, 1, 0)}
      >
        <img
          src="/transparent-logo.png"
          alt="UCLM CARES seal"
          className="h-[58%] w-[58%] object-contain motion-safe:animate-landing-float"
        />
      </div>
      {LANDING_HEX_PHOTOS.map((photo, index) => (
        <div
          key={photo.src}
          className={`${CELL_ENTER} group absolute bg-white/10`}
          style={cellStyle(photo.x, photo.y, index + 1)}
        >
          <img
            src={photo.src}
            alt={photo.alt}
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
          />
          <span
            aria-hidden
            className="absolute inset-0 bg-[var(--cares-primary)] opacity-20 transition-opacity duration-500 group-hover:opacity-0"
          />
        </div>
      ))}
    </div>
  )
}
