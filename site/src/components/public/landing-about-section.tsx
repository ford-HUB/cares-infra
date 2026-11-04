import { LANDING_SECTION_IDS } from '../../constants/landing-bulletin'
import { LANDING_PAGE_HEADERS } from '../../constants/landing-home'
import { LandingAbout } from './landing-about'
import { LandingDirectorMessage } from './landing-director-message'
import { LandingOrgChart } from './landing-org-chart'
import { LandingPageHeader } from './landing-page-header'
import { LandingSection } from './ui/landing-section'

export function LandingAboutSection() {
  return (
    <LandingSection id={LANDING_SECTION_IDS.about}>
      <LandingPageHeader {...LANDING_PAGE_HEADERS.about} />
      <LandingAbout />
      <LandingOrgChart />
      <LandingDirectorMessage />
    </LandingSection>
  )
}
