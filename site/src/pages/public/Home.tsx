import { LandingExplore } from '../../components/public/landing-explore'
import { LandingHero } from '../../components/public/landing-hero'
import { LandingHomeStats } from '../../components/public/landing-home-stats'
import { LandingImpact } from '../../components/public/landing-impact'

export default function Home() {
  return (
    <>
      <LandingHero />
      <LandingImpact />
      <LandingHomeStats />
      <LandingExplore />
    </>
  )
}
