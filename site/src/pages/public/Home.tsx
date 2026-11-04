import { LandingAboutSection } from '../../components/public/landing-about-section'
import { LandingHighlightsSection } from '../../components/public/landing-highlights-section'
import { LandingHomeSection } from '../../components/public/landing-home-section'
import { LandingProgramsSection } from '../../components/public/landing-programs-section'
import { AuthModalHost } from '../auth/auth-modal-host'

/** The whole public site, one section after another on a single scrolling page. It stays
 *  mounted under /login and /request-access, whose forms float over it as modals. */
export default function Home() {
  return (
    <>
      <LandingHomeSection />
      <LandingAboutSection />
      <LandingProgramsSection />
      <LandingHighlightsSection />
      <AuthModalHost />
    </>
  )
}
