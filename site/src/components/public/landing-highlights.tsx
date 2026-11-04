import { LANDING_HIGHLIGHT_YEARS } from '../../constants/landing-highlights'
import { LandingHighlightYear } from './ui/landing-highlight-year'
import { LANDING_CONTAINER } from '../../constants/landing-bulletin'
import { LandingHillsBackdrop } from './ui/landing-about-botanicals'

/** Achievements by year, newest first. */
export function LandingHighlights() {
  return (
    <div className="relative overflow-clip">
      <LandingHillsBackdrop />
      <div className={`${LANDING_CONTAINER} relative pt-10 pb-40 sm:pb-44`}>
        {LANDING_HIGHLIGHT_YEARS.map((highlight) => (
          <LandingHighlightYear key={highlight.year} highlight={highlight} />
        ))}
      </div>
    </div>
  )
}
