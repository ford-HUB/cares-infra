import { Card } from '../ui/card'
import { LANDING_PROGRAMS, LANDING_SERIF } from '../../constants/landing-bulletin'
import { LandingReveal } from './ui/landing-reveal'
import { LandingSectionHeading } from './ui/landing-section-heading'

const COLUMNS_XL = 4

export function LandingPrograms() {
  return (
    <section className="border-b border-[var(--cares-border)] bg-white">
      <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <LandingReveal>
          <LandingSectionHeading
            title="One for every college and unit"
            description="Each college and unit brings its discipline to the partner communities — every event these programs run is planned and staffed in the portal."
          />
        </LandingReveal>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {LANDING_PROGRAMS.map((program, index) => (
            <LandingReveal key={program.acronym} index={index % COLUMNS_XL} className="h-full">
              <Card
                size="sm"
                className="group relative h-full shadow-sm transition-[box-shadow,transform] duration-300 hover:-translate-y-1 hover:shadow-lg hover:ring-emerald-200"
              >
                <span
                  aria-hidden
                  className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-gradient-to-r from-[var(--cares-primary)] to-emerald-400 transition-transform duration-500 group-hover:scale-x-100"
                />
                <div className="px-3">
                  <p className="text-[11px] tracking-wider text-gray-500 uppercase">
                    {program.department}
                  </p>
                  <p
                    className={`${LANDING_SERIF} mt-1.5 text-lg text-[var(--cares-primary)] transition-colors duration-300 group-hover:text-[var(--cares-primary-hover)]`}
                  >
                    {program.acronym}
                  </p>
                  <p className="mt-0.5 text-[12px] leading-snug text-pretty text-gray-500">
                    {program.name}
                  </p>
                </div>
                <ul className="mt-auto flex flex-wrap gap-1.5 px-3">
                  {program.activities.map((activity) => (
                    <li
                      key={activity}
                      className="rounded-md bg-[var(--cares-bg)] px-2 py-0.5 text-[11px] text-gray-700 transition-colors duration-300 group-hover:bg-emerald-50 group-hover:text-emerald-800"
                    >
                      {activity}
                    </li>
                  ))}
                </ul>
              </Card>
            </LandingReveal>
          ))}
        </div>
      </div>
    </section>
  )
}
