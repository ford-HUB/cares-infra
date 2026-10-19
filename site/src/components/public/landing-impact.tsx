import { Card } from '../ui/card'
import { useCountUp } from '../../hooks/use-count-up'
import { useReveal } from '../../hooks/use-reveal'
import {
  LANDING_IMPACT,
  LANDING_MOTION,
  type LandingImpactStat,
} from '../../constants/landing-bulletin'

function ImpactCell({ stat, start }: { stat: LandingImpactStat; start: boolean }) {
  const value = useCountUp(stat.count, start, LANDING_MOTION.countUpMs)

  return (
    <div className="group flex items-start gap-3 bg-white p-5 transition-colors duration-300 hover:bg-emerald-50/50">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 transition-colors duration-300 group-hover:bg-[var(--cares-primary)] group-hover:text-white">
        <stat.icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="flex items-baseline gap-1.5">
          <span className="text-2xl font-semibold text-gray-900 tabular-nums">
            <span aria-hidden>
              {value}
              {stat.suffix}
            </span>
            <span className="sr-only">
              {stat.count}
              {stat.suffix}
            </span>
          </span>
          <span className="text-[13px] text-gray-600">{stat.label}</span>
        </p>
        <p className="mt-0.5 text-[12px] text-gray-400">{stat.source}</p>
      </div>
    </div>
  )
}

/** Independent headline figures from the 2024–2025 bulletin — no shared whole,
 *  so they sit side by side in one card rather than as a part-to-whole bar. */
export function LandingImpact() {
  const { ref, visible } = useReveal<HTMLDivElement>(0.3)

  return (
    <section className="relative z-10 mx-auto -mt-12 w-full max-w-6xl px-5 sm:px-8">
      <div ref={ref}>
        <Card className="grid gap-px bg-gray-100 py-0 shadow-lg shadow-black/5 sm:grid-cols-2 lg:grid-cols-4">
          {LANDING_IMPACT.map((stat) => (
            <ImpactCell key={stat.label} stat={stat} start={visible} />
          ))}
        </Card>
      </div>
    </section>
  )
}
