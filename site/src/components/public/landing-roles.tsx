import { Card } from '../ui/card'
import { LANDING_ROLES } from '../../constants/landing'

export function LandingRoles() {
  return (
    <section className="mx-auto w-full max-w-6xl px-5 pb-14 sm:px-8">
      <div className="mb-4">
        <h2 className="text-[15px] font-semibold text-[var(--cares-heading)]">
          One sign-in, three responsibilities
        </h2>
        <p className="mt-1 text-[13px] text-[var(--cares-muted)]">
          Everyone lands on the same portal — your role decides what appears in the sidebar.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {LANDING_ROLES.map((role) => (
          <Card key={role.name} size="sm" className="shadow-sm">
            <div className="flex items-start gap-3 px-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                <role.icon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-gray-900">{role.name}</p>
                <p className="text-[11px] tracking-wider text-gray-500 uppercase">{role.summary}</p>
              </div>
            </div>
            <p className="px-3 text-[13px] leading-relaxed text-gray-700">{role.scope}</p>
          </Card>
        ))}
      </div>
    </section>
  )
}
