import { Star, Users } from 'lucide-react'
import { Card } from '../ui/card'
import { useCountUp } from '../../hooks/use-count-up'
import { useReveal } from '../../hooks/use-reveal'
import { LANDING_MOTION, LANDING_SECTION_IDS } from '../../constants/landing-bulletin'
import {
  LANDING_BENEFICIARY_GROUPS,
  LANDING_NUMBER_FORMAT,
  LANDING_PERCENT_FORMAT,
  LANDING_RATING_BUCKETS,
  LANDING_RATING_MAX,
  LANDING_STATS_NOTE,
} from '../../constants/landing-home'
import { LandingReveal } from './ui/landing-reveal'
import { LandingSectionHeading } from './ui/landing-section-heading'

const RATING_TOTAL = LANDING_RATING_BUCKETS.reduce((sum, b) => sum + b.count, 0)
const RATING_AVERAGE =
  RATING_TOTAL === 0
    ? 0
    : LANDING_RATING_BUCKETS.reduce((sum, b) => sum + b.stars * b.count, 0) / RATING_TOTAL
const BENEFICIARY_TOTAL = LANDING_BENEFICIARY_GROUPS.reduce((sum, g) => sum + g.count, 0)

const share = (count: number, total: number) => (total === 0 ? 0 : count / total)

/** Five stars filled to `value`, with partial fill on the last one. */
function StarRow({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5" aria-hidden>
      {Array.from({ length: LANDING_RATING_MAX }, (_, i) => {
        const fill = Math.max(0, Math.min(1, value - i))
        return (
          <span key={i} className="relative h-5 w-5">
            <Star className="absolute inset-0 h-5 w-5 text-gray-200" fill="currentColor" />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star className="h-5 w-5 text-amber-400" fill="currentColor" />
            </span>
          </span>
        )
      })}
    </div>
  )
}

function RatingCard({ start }: { start: boolean }) {
  const tenths = useCountUp(Math.round(RATING_AVERAGE * 10), start, LANDING_MOTION.countUpMs)
  const shown = tenths / 10

  return (
    <Card className="h-full gap-5 px-5 py-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] tracking-wider text-gray-500 uppercase">Overall rating</p>
          <p className="mt-1 flex items-baseline gap-1.5">
            <span className="text-4xl font-semibold text-gray-900 tabular-nums">
              {shown.toFixed(1)}
            </span>
            <span className="text-[13px] text-gray-500">of {LANDING_RATING_MAX}</span>
          </p>
          <div className="mt-2">
            <StarRow value={shown} />
          </div>
          <p className="mt-2 text-[12px] text-gray-500 tabular-nums">
            from {LANDING_NUMBER_FORMAT.format(RATING_TOTAL)} event evaluations
          </p>
        </div>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-500">
          <Star className="h-5 w-5" fill="currentColor" />
        </span>
      </div>

      <ul className="flex flex-col gap-2">
        {LANDING_RATING_BUCKETS.map((bucket) => {
          const part = share(bucket.count, RATING_TOTAL)
          return (
            <li key={bucket.stars} className="flex items-center gap-3 text-[12px]">
              <span className="w-8 shrink-0 text-gray-600 tabular-nums">{bucket.stars} ★</span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                <span
                  className="block h-full rounded-full bg-amber-400 motion-safe:transition-[width] motion-safe:duration-1000 motion-safe:ease-out"
                  style={{ width: start ? `${part * 100}%` : '0%' }}
                />
              </span>
              <span className="w-10 shrink-0 text-right text-gray-500 tabular-nums">
                {LANDING_PERCENT_FORMAT.format(part)}
              </span>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

function BeneficiariesCard({ start }: { start: boolean }) {
  const total = useCountUp(BENEFICIARY_TOTAL, start, LANDING_MOTION.countUpMs)

  return (
    <Card className="h-full gap-5 px-5 py-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] tracking-wider text-gray-500 uppercase">Beneficiaries served</p>
          <p className="mt-1 text-4xl font-semibold text-gray-900 tabular-nums">
            {LANDING_NUMBER_FORMAT.format(total)}
          </p>
          <p className="mt-2 text-[12px] text-gray-500">
            across the adopted barangays and other partner communities
          </p>
        </div>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
          <Users className="h-5 w-5" />
        </span>
      </div>

      <div>
        <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
          {LANDING_BENEFICIARY_GROUPS.map((group) => (
            <span
              key={group.label}
              className={`${group.barClass} h-full motion-safe:transition-[width] motion-safe:duration-1000 motion-safe:ease-out`}
              style={{ width: start ? `${share(group.count, BENEFICIARY_TOTAL) * 100}%` : '0%' }}
            />
          ))}
        </div>
        <ul className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-2">
          {LANDING_BENEFICIARY_GROUPS.map((group) => (
            <li key={group.label} className="flex items-center gap-2 text-[12px]">
              <span className={`h-2 w-2 shrink-0 rounded-full ${group.dotClass}`} />
              <span className="min-w-0 flex-1 truncate text-gray-600">{group.label}</span>
              <span className="font-semibold text-gray-800 tabular-nums">
                {LANDING_NUMBER_FORMAT.format(group.count)}
              </span>
              <span className="w-9 text-right text-gray-400 tabular-nums">
                {LANDING_PERCENT_FORMAT.format(share(group.count, BENEFICIARY_TOTAL))}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  )
}

export function LandingHomeStats() {
  const { ref, visible } = useReveal<HTMLDivElement>(0.25)

  return (
    <section
      id={LANDING_SECTION_IDS.homeStats}
      className="mx-auto w-full max-w-6xl scroll-mt-16 px-5 py-16 sm:px-8 sm:py-20"
    >
      <LandingReveal>
        <LandingSectionHeading
          title="How our communities rate the work"
          description="What volunteers and beneficiaries tell us after each event, and how many people CARES programs reached this school year."
        />
      </LandingReveal>

      <div ref={ref} className="grid gap-4 lg:grid-cols-2">
        <LandingReveal className="h-full">
          <RatingCard start={visible} />
        </LandingReveal>
        <LandingReveal index={1} className="h-full">
          <BeneficiariesCard start={visible} />
        </LandingReveal>
      </div>

      <p className="mt-4 text-[11px] text-gray-400">{LANDING_STATS_NOTE}</p>
    </section>
  )
}
