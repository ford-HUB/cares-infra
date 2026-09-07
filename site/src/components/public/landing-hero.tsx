import { ArrowRight, Check } from 'lucide-react'
import { Link } from 'react-router-dom'
import { LOGIN_PATH, REQUEST_ACCESS_PATH } from '../../constants/routes'
import { LANDING_TRUST_POINTS } from '../../constants/landing'
import { LandingPreviewCard } from './landing-preview-card'

export function LandingHero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -right-32 h-96 w-96 rounded-full bg-[var(--cares-primary-hover)] opacity-[0.07]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-[var(--cares-primary)] opacity-[0.06]"
      />

      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-10 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--cares-border)] bg-white px-3 py-1 text-[11px] font-medium tracking-wider text-[var(--cares-body)] uppercase">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--cares-primary)]" />
            UCLM Community Extension
          </span>

          <h1 className="mt-5 text-3xl leading-tight font-bold text-[var(--cares-heading)] sm:text-4xl">
            Every outreach program,
            <br className="hidden sm:block" /> run from one portal.
          </h1>

          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-[var(--cares-body)]">
            CARES is where UCLM staff schedule community events, deploy and track volunteers on
            site, and issue the certificates and reports that follow. Volunteers join from the
            mobile app; you manage the whole program here.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              to={LOGIN_PATH}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--cares-primary)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--cares-primary-hover)] focus-visible:ring-2 focus-visible:ring-[var(--cares-primary)] focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              Sign in
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to={REQUEST_ACCESS_PATH}
              className="inline-flex items-center rounded-lg border border-[var(--cares-border)] bg-white px-5 py-2.5 text-sm font-semibold text-[var(--cares-heading)] transition-colors hover:bg-[var(--cares-bg)] focus-visible:ring-2 focus-visible:ring-[var(--cares-primary)] focus-visible:outline-none"
            >
              Request administrator access
            </Link>
          </div>

          <ul className="mt-7 flex flex-col gap-1.5">
            {LANDING_TRUST_POINTS.map((point) => (
              <li key={point} className="flex items-start gap-2 text-[12px] text-[var(--cares-muted)]">
                <Check className="mt-[3px] h-3.5 w-3.5 shrink-0 text-[var(--cares-primary-hover)]" />
                {point}
              </li>
            ))}
          </ul>
        </div>

        <div className="min-w-0 lg:pl-4">
          <LandingPreviewCard />
        </div>
      </div>
    </section>
  )
}
