import { Handshake, MapPin } from 'lucide-react'
import { LANDING_BARANGAYS, LANDING_PARTNERS } from '../../constants/landing-bulletin'
import { LandingReveal } from './ui/landing-reveal'
import { LandingSectionHeading } from './ui/landing-section-heading'

export function LandingCommunities() {
  return (
    <section className="bg-[var(--cares-primary)] text-white">
      <div className="mx-auto grid w-full max-w-6xl gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-2">
        <div>
          <LandingSectionHeading
            tone="dark"
            title="Adopted communities"
            description="UCLM's partner barangays, where most CARES programs and volunteer deployments take place."
          />
          <ul className="grid grid-cols-2 gap-3">
            {LANDING_BARANGAYS.map((barangay, index) => (
              <LandingReveal key={barangay.name} as="li" index={index}>
                <div className="group flex h-full items-center gap-3 rounded-xl bg-white/5 p-4 ring-1 ring-white/10 transition-colors duration-300 hover:bg-white/10 hover:ring-emerald-300/40">
                  <MapPin className="h-4 w-4 shrink-0 text-emerald-300 transition-transform duration-300 group-hover:-translate-y-0.5" />
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold">Barangay {barangay.name}</p>
                    <p className="text-[12px] text-white/60">{barangay.city}</p>
                  </div>
                </div>
              </LandingReveal>
            ))}
          </ul>
        </div>

        <div>
          <LandingSectionHeading
            tone="dark"
            title="Partner organizations"
            description="Institutions that co-ran outreach, relief and health drives with CARES this year."
          />
          <ul className="flex flex-wrap gap-2">
            {LANDING_PARTNERS.map((partner, index) => (
              <LandingReveal key={partner} as="li" index={index}>
                <span className="flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 text-[13px] text-white/85 ring-1 ring-white/10 transition-colors duration-300 hover:bg-white/10 hover:text-white">
                  <Handshake className="h-3.5 w-3.5 text-emerald-300" />
                  {partner}
                </span>
              </LandingReveal>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
