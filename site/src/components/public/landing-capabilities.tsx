import { LANDING_CAPABILITIES } from '../../constants/landing'

export function LandingCapabilities() {
  return (
    <section className="border-t border-[var(--cares-border)] bg-white">
      <div className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-8">
        <div className="mb-6">
          <h2 className="text-[15px] font-semibold text-[var(--cares-heading)]">
            What the portal covers
          </h2>
          <p className="mt-1 text-[13px] text-[var(--cares-muted)]">
            From the first calendar entry to the signed certificate at the end.
          </p>
        </div>

        <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
          {LANDING_CAPABILITIES.map((capability) => (
            <div key={capability.title} className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                <capability.icon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-gray-900">{capability.title}</p>
                <p className="mt-0.5 text-[13px] leading-relaxed text-gray-600">
                  {capability.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
