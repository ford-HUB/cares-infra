import { cn } from '@/lib/utils'

/** The light catching the glass: a sheen over the top half and a soft diagonal glint,
 *  optionally with faint water ripples across the card. Clipped to the card's own
 *  corners, so it works on a card that lets other content overhang its edges. `cream`
 *  tints the sheen and glint warm cream instead of white. */
export function GlassSheen({
  emphasis = false,
  ripples = false,
  cream = false,
}: {
  emphasis?: boolean
  ripples?: boolean
  cream?: boolean
}) {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit]"
    >
      <span
        className={cn(
          'absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b to-transparent',
          emphasis ? 'from-white/25' : cream ? 'from-[var(--cares-about-card)]/80' : 'from-white/80',
        )}
      />
      <span
        className={cn(
          'absolute -top-6 left-1/4 h-16 w-1/2 rotate-[-8deg] rounded-full blur-xl',
          emphasis ? 'bg-white/15' : cream ? 'bg-[var(--cares-about-card)]/60' : 'bg-white/60',
        )}
      />
      {ripples && (
        <svg
          viewBox="0 0 200 120"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full fill-none stroke-white"
        >
          <path d="M0 34 C50 14 120 46 200 22" strokeOpacity={0.6} strokeWidth={1.25} vectorEffect="non-scaling-stroke" />
          <path d="M0 80 C60 60 120 100 200 72" strokeOpacity={0.7} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
          <path d="M0 98 C60 82 130 118 200 90 V120 H0 Z" className="fill-white/35 stroke-none" />
        </svg>
      )}
    </span>
  )
}
