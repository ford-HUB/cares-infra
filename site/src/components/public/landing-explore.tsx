import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { LANDING_SERIF } from '../../constants/landing-bulletin'
import { LANDING_EXPLORE_LINKS } from '../../constants/landing-home'
import { LandingReveal } from './ui/landing-reveal'
import { LandingSectionHeading } from './ui/landing-section-heading'

/** Home-page signposts to the inner pages of the public site. */
export function LandingExplore() {
  return (
    <section className="border-t border-[var(--cares-border)] bg-white">
      <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <LandingReveal>
          <LandingSectionHeading title="Get to know UCLM CARES" />
        </LandingReveal>

        <div className="grid gap-4 md:grid-cols-3">
          {LANDING_EXPLORE_LINKS.map((link, index) => (
            <LandingReveal key={link.to} index={index} className="h-full">
              <Link
                to={link.to}
                className="group flex h-full flex-col rounded-2xl bg-[var(--cares-bg)] p-6 ring-1 ring-[var(--cares-border)] transition-[box-shadow,transform,background-color] duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-lg focus-visible:ring-2 focus-visible:ring-[var(--cares-primary)] focus-visible:outline-none"
              >
                <span className="flex items-center justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-emerald-700 shadow-sm transition-colors duration-300 group-hover:bg-[var(--cares-primary)] group-hover:text-white">
                    <link.icon className="h-5 w-5" />
                  </span>
                  <ArrowUpRight className="h-5 w-5 text-gray-400 transition-[transform,color] duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[var(--cares-primary)]" />
                </span>
                <span className={`${LANDING_SERIF} mt-5 text-xl text-[var(--cares-heading)]`}>
                  {link.title}
                </span>
                <span className="mt-2 text-[13px] leading-relaxed text-pretty text-gray-600">
                  {link.description}
                </span>
              </Link>
            </LandingReveal>
          ))}
        </div>
      </div>
    </section>
  )
}
