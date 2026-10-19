import { LANDING_MOTION, LANDING_SERIF } from '../../constants/landing-bulletin'

interface LandingPageHeaderProps {
  title: string
  description: string
}

const ENTER =
  'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:fill-mode-both motion-safe:duration-700'
const step = (n: number) => ({ animationDelay: `${n * LANDING_MOTION.heroStepMs}ms` })

/** Green banner that opens every inner page of the public site. */
export function LandingPageHeader({ title, description }: LandingPageHeaderProps) {
  return (
    <section className="relative overflow-hidden bg-[var(--cares-primary)] text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -right-24 h-80 w-80 rounded-full bg-[var(--cares-primary-hover)] opacity-40 blur-3xl"
      />
      <img
        src="/transparent-logo.png"
        alt=""
        aria-hidden
        className="pointer-events-none absolute -right-10 -bottom-16 hidden h-64 w-64 opacity-[0.07] sm:block"
      />
      <div className="relative mx-auto w-full max-w-6xl px-5 py-14 text-center sm:px-8 sm:py-16">
        <h1
          className={`${LANDING_SERIF} ${ENTER} mx-auto max-w-3xl text-3xl leading-tight font-bold text-balance sm:text-4xl`}
          style={step(0)}
        >
          {title}
        </h1>
        <span
          aria-hidden
          className={`${ENTER} mx-auto mt-5 block h-0.5 w-12 rounded-full bg-emerald-300`}
          style={step(1)}
        />
        <p
          className={`${ENTER} mx-auto mt-5 max-w-2xl text-[15px] leading-relaxed text-pretty text-white/75`}
          style={step(2)}
        >
          {description}
        </p>
      </div>
    </section>
  )
}
