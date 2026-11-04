import { LANDING_SECTION_IDS } from '../../constants/landing-bulletin'
import { LANDING_PAGE_HEADERS } from '../../constants/landing-home'
import { LandingPageHeader } from './landing-page-header'
import { LandingPrograms } from './landing-programs'
import { LandingSection } from './ui/landing-section'

export function LandingProgramsSection() {
  return (
    <LandingSection id={LANDING_SECTION_IDS.programs}>
      <LandingPageHeader {...LANDING_PAGE_HEADERS.programs} />
      <LandingPrograms />
    </LandingSection>
  )
}
