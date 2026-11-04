import { useCountUp } from '../../hooks/use-count-up'
import { useReveal } from '../../hooks/use-reveal'
import {
  LANDING_CONTAINER,
  LANDING_IMPACT,
  LANDING_MOTION,
  type LandingImpactStat,
} from '../../constants/landing-bulletin'

function ImpactCell({ stat, start }: { stat: LandingImpactStat; start: boolean }) {
  const value = useCountUp(stat.count, start, LANDING_MOTION.countUpMs)

  return (
    <div className="group flex items-start gap-3 px-4 py-6 lg:[&:not(:first-child)]:border-l lg:[&:not(:first-child)]:border-gray-100">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-[var(--cares-primary)] transition-colors duration-300 group-hover:bg-[var(--cares-primary)] group-hover:text-white">
        <stat.icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="flex flex-wrap items-baseline gap-x-1.5 xl:flex-nowrap">
          <span className="text-2xl leading-none font-bold text-gray-900 tabular-nums">
            <span aria-hidden>
              {value}
              {stat.suffix}
            </span>
            <span className="sr-only">
              {stat.count}
              {stat.suffix}
            </span>
          </span>
          <span className="text-[12px] font-medium tracking-tight whitespace-nowrap text-gray-800">{stat.label}</span>
        </p>
        <p className="mt-2 text-[13px] leading-snug text-gray-500">{stat.source}</p>
      </div>
    </div>
  )
}

/** Independent headline figures from the 2024–2025 bulletin — no shared whole,
 *  so they sit side by side in one card rather than as a part-to-whole bar. */
export function LandingImpact() {
  const { ref, visible } = useReveal<HTMLDivElement>(0.3)

  return (
    <section className={`${LANDING_CONTAINER} relative z-10 -mt-14`}>
      <div
        ref={ref}
        className="grid divide-y divide-gray-100 rounded-2xl bg-white shadow-xl shadow-black/10 sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4"
      >
        {LANDING_IMPACT.map((stat) => (
          <ImpactCell key={stat.label} stat={stat} start={visible} />
        ))}
      </div>
    </section>
  )
}
