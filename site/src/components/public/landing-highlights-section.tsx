import { LANDING_SECTION_IDS } from '../../constants/landing-bulletin'
import { LANDING_PAGE_HEADERS } from '../../constants/landing-home'
import { LandingHighlights } from './landing-highlights'
import { LandingPageHeader } from './landing-page-header'
import { LandingSection } from './ui/landing-section'

export function LandingHighlightsSection() {
  return (
    <LandingSection id={LANDING_SECTION_IDS.highlights}>
      <LandingPageHeader {...LANDING_PAGE_HEADERS.highlights} />
      <LandingHighlights />
    </LandingSection>
  )
}
