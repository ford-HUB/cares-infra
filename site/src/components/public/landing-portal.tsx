import { LandingCapabilities } from './landing-capabilities'
import { LandingPreviewCard } from './landing-preview-card'
import { LandingRoles } from './landing-roles'
import { LandingReveal } from './ui/landing-reveal'
import { LandingSectionHeading } from './ui/landing-section-heading'

export function LandingPortal() {
  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
      <div className="grid items-end gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <LandingReveal>
          <LandingSectionHeading
            title="Three responsibilities"
            description="Your role decides what appears in the sidebar — from event setup to live attendance and certificates."
          />
        </LandingReveal>
        <LandingReveal index={1} className="mb-10 min-w-0">
          <LandingPreviewCard />
        </LandingReveal>
      </div>

      <LandingRoles />
      <LandingCapabilities />
    </section>
  )
}
