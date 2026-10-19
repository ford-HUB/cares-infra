import { useReveal } from '../../../hooks/use-reveal'
import { LANDING_SERIF } from '../../../constants/landing-bulletin'

interface LandingSectionHeadingProps {
  title: string
  description?: string
  tone?: 'light' | 'dark'
}

/** Centred, bold section title with a short accent rule that draws in on view. */
export function LandingSectionHeading({
  title,
  description,
  tone = 'light',
}: LandingSectionHeadingProps) {
  const dark = tone === 'dark'
  const { ref, visible } = useReveal<HTMLDivElement>(0.4)

  return (
    <div ref={ref} className="mx-auto mb-10 max-w-2xl text-center">
      <h2
        className={`${LANDING_SERIF} text-2xl leading-snug font-bold text-balance sm:text-3xl ${dark ? 'text-white' : 'text-[var(--cares-heading)]'}`}
      >
        {title}
      </h2>
      <span
        aria-hidden
        className={`mx-auto mt-4 block h-0.5 rounded-full motion-safe:transition-[width] motion-safe:duration-700 ${visible ? 'w-12' : 'w-12 motion-safe:w-0'} ${dark ? 'bg-emerald-300' : 'bg-[var(--cares-primary-hover)]'}`}
      />
      {description && (
        <p
          className={`mt-4 text-[14px] leading-relaxed text-pretty ${dark ? 'text-white/70' : 'text-[var(--cares-muted)]'}`}
        >
          {description}
        </p>
      )}
    </div>
  )
}
