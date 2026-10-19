import { LANDING_SECTION_IDS } from '../../constants/landing-bulletin'
import {
  LANDING_ORG_CAMPUS_DIRECTOR,
  LANDING_ORG_CARES_DIRECTOR,
  LANDING_ORG_CARES_STAFF,
  LANDING_ORG_COORDINATORS,
  LANDING_ORG_GROUPS,
  LANDING_ORG_SOURCE,
} from '../../constants/landing-org'
import { LandingReveal } from './ui/landing-reveal'
import { LandingSectionHeading } from './ui/landing-section-heading'
import {
  LandingOrgConnector,
  LandingOrgGroupNode,
  LandingOrgPersonNode,
} from './ui/landing-org-node'

export function LandingOrgChart() {
  return (
    <section
      id={LANDING_SECTION_IDS.organization}
      className="scroll-mt-28 border-y border-[var(--cares-border)] bg-white"
    >
      <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <LandingReveal>
          <LandingSectionHeading
            title="UCLM CARES organizational chart"
            description="The office that coordinates extension work across every department, and the coordinators who carry it into each college."
          />
        </LandingReveal>

        <LandingReveal className="flex flex-col items-center">
          <LandingOrgPersonNode person={LANDING_ORG_CAMPUS_DIRECTOR} />
        </LandingReveal>
        <LandingOrgConnector />

        <LandingReveal className="flex flex-col items-center">
          <LandingOrgPersonNode person={LANDING_ORG_CARES_DIRECTOR} emphasis />
        </LandingReveal>
        <LandingOrgConnector />

        <LandingReveal className="flex flex-col items-center">
          <LandingOrgPersonNode person={LANDING_ORG_CARES_STAFF} />
        </LandingReveal>
        <LandingOrgConnector />

        <div className="rounded-2xl bg-[var(--cares-bg)] p-4 ring-1 ring-[var(--cares-border)] sm:p-6">
          <p className="mb-4 text-center text-[11px] font-semibold tracking-[0.2em] text-[var(--cares-primary-hover)] uppercase">
            Departmental CARES coordinators
          </p>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {LANDING_ORG_COORDINATORS.map((coordinator, index) => (
              <LandingReveal key={coordinator.name} as="li" index={index % 5}>
                <div className="group flex h-full flex-col items-center rounded-xl bg-white p-3 text-center shadow-sm ring-1 ring-gray-200 transition-[box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:shadow-md">
                  <span className="h-16 w-16 overflow-hidden rounded-full ring-2 ring-emerald-100 transition-[box-shadow] duration-300 group-hover:ring-emerald-400">
                    <img
                      src={coordinator.photo}
                      alt={coordinator.name}
                      loading="lazy"
                      className="h-full w-full scale-110 object-cover object-top transition-transform duration-500 group-hover:scale-125"
                    />
                  </span>
                  <p className="mt-2.5 text-[13px] leading-snug font-semibold text-balance text-gray-900">
                    {coordinator.name}
                  </p>
                  <p className="mt-1 text-[11px] leading-snug tracking-wide text-balance text-gray-500 uppercase">
                    {coordinator.role}
                  </p>
                </div>
              </LandingReveal>
            ))}
          </ul>
        </div>

        <LandingOrgConnector />
        <LandingReveal className="flex justify-center">
          <LandingOrgGroupNode label={LANDING_ORG_GROUPS.faculty} />
        </LandingReveal>
        <LandingOrgConnector />
        <LandingReveal className="flex justify-center">
          <LandingOrgGroupNode label={LANDING_ORG_GROUPS.students} />
        </LandingReveal>

        <p className="mt-8 text-center text-[11px] text-gray-400">{LANDING_ORG_SOURCE}</p>
      </div>
    </section>
  )
}
