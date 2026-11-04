import { LANDING_SECTION_IDS } from '../../constants/landing-bulletin'
import { LandingHero } from './landing-hero'
import { LandingPartners } from './landing-partners'
import { LandingVideo } from './landing-video'
import { LandingSection } from './ui/landing-section'

export function LandingHomeSection() {
  return (
    <LandingSection id={LANDING_SECTION_IDS.home}>
      <LandingHero />
      <LandingVideo />
      <LandingPartners />
    </LandingSection>
  )
}
