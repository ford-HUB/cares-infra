import { Card } from '../ui/card'
import { LANDING_ROLES } from '../../constants/landing'
import { LandingReveal } from './ui/landing-reveal'

export function LandingRoles() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {LANDING_ROLES.map((role, index) => (
        <LandingReveal key={role.name} index={index} className="h-full">
          <Card
            size="sm"
            className="group h-full shadow-sm transition-[box-shadow,transform] duration-300 hover:-translate-y-1 hover:shadow-lg"
          >
            <div className="flex items-start gap-3 px-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 transition-colors duration-300 group-hover:bg-[var(--cares-primary)] group-hover:text-white">
                <role.icon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-gray-900">{role.name}</p>
                <p className="text-[11px] tracking-wider text-gray-500 uppercase">{role.summary}</p>
              </div>
            </div>
            <p className="px-3 text-[13px] leading-relaxed text-pretty text-gray-700">
              {role.scope}
            </p>
          </Card>
        </LandingReveal>
      ))}
    </div>
  )
}
