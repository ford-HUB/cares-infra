import { LandingAboutSection } from '../../components/public/landing-about-section'
import { LandingHighlightsSection } from '../../components/public/landing-highlights-section'
import { LandingHomeSection } from '../../components/public/landing-home-section'
import { LandingProgramsSection } from '../../components/public/landing-programs-section'
import { AuthModalHost } from '../auth/auth-modal-host'

/** Stays mounted under /login and /request-access, which open as modals. */
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
