/** Bottom edge of rolling hills. */
function Hills({ back, front }: { back: string; front: string }) {
  return (
    <svg
      viewBox="0 0 1440 200"
      preserveAspectRatio="none"
      className="absolute inset-x-0 bottom-0 h-40 w-full"
    >
      <path d="M0 90 C220 30 420 150 720 150 C1020 150 1220 30 1440 80 V200 H0 Z" className={back} />
      <path d="M0 150 C260 100 460 190 740 180 C1020 170 1220 110 1440 140 V200 H0 Z" className={front} />
    </svg>
  )
}

/** A mint tint closing on rolling dark-green hills: the backdrop of the public site's light
 *  sections. `hills={false}` keeps the tint alone, for a section that runs straight on
 *  into another mint one. */
export function LandingHillsBackdrop({ hills = true }: { hills?: boolean }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-emerald-50/80" />
      {hills && <Hills back="fill-[var(--cares-primary)]/45" front="fill-[var(--cares-primary)]" />}
    </div>
  )
}
