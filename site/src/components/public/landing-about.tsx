import {
  LANDING_CONTAINER,
  LANDING_CORE_PROCESSES,
  LANDING_MOTION,
  LANDING_SECTION_IDS,
} from '../../constants/landing-bulletin'
import { LandingHillsBackdrop } from './ui/landing-about-botanicals'
import { LandingAboutObjectives } from './ui/landing-about-objectives'
import { LandingAboutStatements } from './ui/landing-about-statements'
import { LandingAboutProcessCard } from './ui/landing-about-process-card'
import { LandingReveal } from './ui/landing-reveal'
import { LandingSectionHeading } from './ui/landing-section-heading'

/** Vision and mission as dark posters, the core processes as centred icon cards, then
 *  the objectives. */
export function LandingAbout() {
  return (
    <section className="relative overflow-clip">
      {/* Tint only: the org chart below carries it on and closes on the hills. */}
      <LandingHillsBackdrop hills={false} />
      <div className={`${LANDING_CONTAINER} relative py-14 sm:py-16`}>
        <LandingSectionHeading title="Vision and Mission" plain brush risingLetters />
        <div className="mt-10">
          <LandingAboutStatements />
        </div>

        <div className="mt-24 sm:mt-28">
          <LandingSectionHeading title="Core Processes" plain brush risingLetters />
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {LANDING_CORE_PROCESSES.map((process, index) => (
              <LandingReveal
                key={process.title}
                index={index}
                staggerMs={LANDING_MOTION.aboutStaggerMs}
                className="h-full"
              >
                <LandingAboutProcessCard card={process} />
              </LandingReveal>
            ))}
          </div>
        </div>

        <div id={LANDING_SECTION_IDS.objectives} className="mt-24 scroll-mt-28 sm:mt-28">
          <LandingSectionHeading title="Objectives" plain brush risingLetters />
          <div className="mt-6">
            <LandingAboutObjectives />
          </div>
        </div>
      </div>
    </section>
  )
}
