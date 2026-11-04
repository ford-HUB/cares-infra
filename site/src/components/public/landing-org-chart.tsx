import {
  LANDING_CONTAINER,
  LANDING_DISPLAY,
  LANDING_MOTION,
  LANDING_SECTION_IDS,
} from '../../constants/landing-bulletin'
import {
  LANDING_ORG_CAMPUS_DIRECTOR,
  LANDING_ORG_CARES_DIRECTOR,
  LANDING_ORG_CARES_STAFF,
  LANDING_ORG_GROUPS,
  LANDING_ORG_UNITS,
} from '../../constants/landing-org'
import { LandingHillsBackdrop } from './ui/landing-about-botanicals'
import { LandingReveal } from './ui/landing-reveal'
import { LandingSectionHeading } from './ui/landing-section-heading'
import {
  LandingOrgConnector,
  LandingOrgGroupNode,
  LandingOrgPersonNode,
  LandingOrgUnitCard,
} from './ui/landing-org-node'

/** Every card in the chart cascades in at the same gentle step. */
const STAGGER = LANDING_MOTION.orgStaggerMs

export function LandingOrgChart() {
  return (
    <section
      id={LANDING_SECTION_IDS.organization}
      className="relative scroll-mt-28 overflow-clip"
    >
      {/* Tint only: the director's message below carries it on and closes on the hills. */}
      <LandingHillsBackdrop hills={false} />
      <div className={`${LANDING_CONTAINER} relative pt-4 pb-16 sm:pb-20`}>
        <LandingReveal>
          <LandingSectionHeading
            title="UCLM CARES"
            accent="Organizational Chart"
            slab
            description="The office that coordinates extension work across every department, and the coordinators who carry it into each college."
          />
        </LandingReveal>

        <LandingReveal index={0} staggerMs={STAGGER} className="flex flex-col items-center">
          <LandingOrgPersonNode person={LANDING_ORG_CAMPUS_DIRECTOR} />
        </LandingReveal>
        <LandingOrgConnector />

        <LandingReveal index={1} staggerMs={STAGGER} className="flex flex-col items-center">
          <LandingOrgPersonNode person={LANDING_ORG_CARES_DIRECTOR} emphasis />
        </LandingReveal>
        <LandingOrgConnector />

        <LandingReveal index={2} staggerMs={STAGGER} className="flex flex-col items-center">
          <LandingOrgPersonNode person={LANDING_ORG_CARES_STAFF} />
        </LandingReveal>
        <LandingOrgConnector />

        {/* No padding around the coordinators, so the connector above meets the label
            and the one below leaves straight from the cards. */}
        <div>
          {/* Frosted white glass label, shaded a little darker toward its foot: a bright top
              edge, a sheen over its upper half and a soft shadow, in bold Montserrat capitals. */}
          <div className="flex justify-center">
            <p
              className={`${LANDING_DISPLAY} relative isolate overflow-hidden rounded-full border border-white/90 bg-gradient-to-b from-white/95 via-gray-100/90 to-gray-200/80 px-6 py-2 text-center text-[13px] font-bold tracking-[0.06em] text-[var(--cares-primary)] uppercase shadow-[0_8px_20px_-10px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,1)] ring-1 ring-black/10 backdrop-blur-md sm:px-8 sm:text-[15px]`}
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-1/2 bg-gradient-to-b from-white/70 to-transparent"
              />
              Departmental CARES coordinators
            </p>
          </div>
          <LandingOrgConnector className="h-5" />
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {LANDING_ORG_UNITS.map((unit, index) => (
              <LandingReveal
                key={unit.department}
                as="li"
                index={index % 5}
                staggerMs={STAGGER}
              >
                <LandingOrgUnitCard unit={unit} />
              </LandingReveal>
            ))}
          </ul>
        </div>

        <LandingOrgConnector />
        <LandingReveal index={0} staggerMs={STAGGER} className="flex justify-center">
          <LandingOrgGroupNode label={LANDING_ORG_GROUPS.faculty} />
        </LandingReveal>
        <LandingOrgConnector />
        <LandingReveal index={1} staggerMs={STAGGER} className="flex justify-center">
          <LandingOrgGroupNode label={LANDING_ORG_GROUPS.students} />
        </LandingReveal>
      </div>
    </section>
  )
}
