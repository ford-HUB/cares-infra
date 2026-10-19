import { LANDING_CAPABILITIES } from '../../constants/landing'
import { LandingReveal } from './ui/landing-reveal'

export function LandingCapabilities() {
  return (
    <div className="mt-12">
      <div className="mb-6">
        <h3 className="text-[15px] font-semibold text-[var(--cares-heading)]">
          What the portal covers
        </h3>
        <p className="mt-1 text-[13px] text-[var(--cares-muted)]">
          From the first calendar entry to the signed certificate at the end.
        </p>
      </div>

      <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
        {LANDING_CAPABILITIES.map((capability, index) => (
          <LandingReveal
            key={capability.title}
            index={index % 3}
            className="group flex items-start gap-3"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 transition-colors duration-300 group-hover:bg-[var(--cares-primary)] group-hover:text-white">
              <capability.icon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-gray-900">{capability.title}</p>
              <p className="mt-0.5 text-[13px] leading-relaxed text-gray-600">
                {capability.description}
              </p>
            </div>
          </LandingReveal>
        ))}
      </div>
    </div>
  )
}
