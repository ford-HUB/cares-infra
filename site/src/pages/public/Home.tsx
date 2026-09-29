import { LandingCapabilities } from '../../components/public/landing-capabilities'
import { LandingFooter } from '../../components/public/landing-footer'
import { LandingHeader } from '../../components/public/landing-header'
import { LandingHero } from '../../components/public/landing-hero'
import { LandingRoles } from '../../components/public/landing-roles'

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--cares-bg)]">
      <LandingHeader />
      <main className="flex-1">
        <LandingHero />
        <LandingRoles />
        <LandingCapabilities />
      </main>
      <LandingFooter />
    </div>
  )
}
