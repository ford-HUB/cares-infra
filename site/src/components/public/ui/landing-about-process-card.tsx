import {
  LANDING_CONDENSED,
  LANDING_MINT_CHIP,
  LANDING_MOTION,
  type LandingAboutCard,
} from '../../../constants/landing-bulletin'
import { useTilt } from '../../../hooks/use-tilt'
import { LandingProcessGlyphIcon } from './landing-process-glyphs'

/** A core process on a cream card: its solid green icon in a large mint circle, centred
 *  above its title in condensed bold capitals. On hover (mouse) the card tilts up to 2°
 *  toward the pointer and lifts 5px, its edge glows mint, the circle grows to 1.08 and the
 *  icon plays its own small motion once. */
export function LandingAboutProcessCard({ card }: { card: LandingAboutCard }) {
  const ref = useTilt<HTMLElement>(LANDING_MOTION.aboutTiltDeg, LANDING_MOTION.processLiftPx)

  return (
    <article
      ref={ref}
      className={`group relative isolate flex h-full flex-col items-center justify-center gap-4 overflow-hidden rounded-2xl border-[2.25px] border-[var(--cares-about-border)] bg-[var(--cares-about-card)] shadow-sm px-6 py-8 text-center transition-[transform,box-shadow,border-color] duration-[400ms] ease-out hover:border-emerald-400 hover:shadow-[0_0_0_3px_rgba(110,231,183,0.35),0_16px_32px_-14px_rgba(16,185,129,0.45)]`}
    >
      <span
        className={`flex h-24 w-24 shrink-0 items-center justify-center rounded-full ${LANDING_MINT_CHIP} motion-safe:transition-transform motion-safe:duration-[400ms] motion-safe:ease-out motion-safe:group-hover:scale-[1.08]`}
      >
        <LandingProcessGlyphIcon glyph={card.glyph} className="h-14 w-14" />
      </span>
      <h3
        className={`${LANDING_CONDENSED} text-[26px] leading-none font-bold tracking-tight text-balance text-[var(--cares-primary)] uppercase sm:text-[30px]`}
      >
        {card.title}
      </h3>
    </article>
  )
}
