import { LANDING_CONTAINER, LANDING_SERIF } from '../../constants/landing-bulletin'
import {
  LANDING_PARTNER_BARANGAYS,
  LANDING_PARTNER_ORGANIZATIONS,
  LANDING_PARTNERS_COPY,
} from '../../constants/landing-home'
import { LandingHillsBackdrop } from './ui/landing-about-botanicals'
import { LandingEyebrowHeading } from './ui/landing-eyebrow-heading'
import { LandingReveal } from './ui/landing-reveal'

/** Barangays first, then organizations, as one run of cards. */
const PARTNERS = [...LANDING_PARTNER_BARANGAYS, ...LANDING_PARTNER_ORGANIZATIONS]

/* Cards per row: two on phones, four from sm, six from lg, each width allowing for the
 * gaps between them (gap-2.5, then gap-3). A short last row stays centred. */
const PER_ROW_LG = 6
const PARTNER_SLOT =
  'w-[calc((100%-0.625rem)/2)] sm:w-[calc((100%-2.25rem)/4)] lg:w-[calc((100%-3.75rem)/6)]'

/* Card hover: a slow 5px lift with a soft mint glow; the logo grows a touch inside it. */
const PARTNER_CARD =
  'group flex h-full flex-col items-center justify-center gap-2 rounded-2xl bg-[var(--cares-about-card)] p-3 text-center shadow-sm ring-1 ring-emerald-900/5 transition-[translate,box-shadow] duration-[400ms] ease-out hover:shadow-[0_16px_32px_-12px_rgba(16,185,129,0.45)] motion-safe:hover:-translate-y-[5px]'
const PARTNER_LOGO =
  'h-20 w-20 object-contain sm:h-24 sm:w-24 motion-safe:transition-transform motion-safe:duration-[400ms] motion-safe:ease-out motion-safe:group-hover:scale-[1.04]'

/** Home-page partners: the adopted barangays and the partner organizations in one
 *  evenly spaced grid, each card fading up in turn. */
export function LandingPartners() {
  const { eyebrow, title, description, listLabel } = LANDING_PARTNERS_COPY

  return (
    <section className="relative overflow-clip">
      <LandingHillsBackdrop />
      {/* Fades in from the video section's mint, so the two meet without a line. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-emerald-50 to-transparent"
      />
      <div className={`${LANDING_CONTAINER} relative pt-10 pb-36 sm:pt-14 sm:pb-40`}>
        <LandingReveal className="mx-auto mb-10 max-w-2xl text-center">
          <LandingEyebrowHeading eyebrow={eyebrow} title={title} description={description} />
        </LandingReveal>

        <ul aria-label={listLabel} className="flex flex-wrap justify-center gap-2.5 sm:gap-3">
          {PARTNERS.map((partner, index) => (
            <LandingReveal
              key={partner.name}
              as="li"
              index={index % PER_ROW_LG}
              className={PARTNER_SLOT}
            >
              <div className={PARTNER_CARD}>
                <img
                  src={partner.logo}
                  alt={`${partner.name} logo`}
                  loading="lazy"
                  className={PARTNER_LOGO}
                />
                <p
                  className={`${LANDING_SERIF} text-[13px] leading-snug font-bold text-balance text-[var(--cares-heading)]`}
                >
                  {partner.name}
                </p>
              </div>
            </LandingReveal>
          ))}
        </ul>
      </div>
    </section>
  )
}
