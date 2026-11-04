const DOTS =
  'absolute bg-[radial-gradient(var(--cares-primary-hover)_1.5px,transparent_1.5px)] [background-size:14px_14px] opacity-30'

/** Decoration around the home-page video: soft glow and dot grids behind the
 *  frame's corners. Purely visual. */
export function LandingVideoBotanicals() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div className="absolute -top-10 -left-10 h-1/2 w-1/2 rounded-full bg-emerald-300/30 blur-3xl" />
      <div className="absolute -right-10 -bottom-10 h-1/2 w-1/2 rounded-full bg-lime-300/30 blur-3xl" />

      <div className={`${DOTS} -top-6 -left-4 h-24 w-32 sm:-top-8 sm:-left-8 sm:h-36 sm:w-52`} />
      <div className={`${DOTS} -right-4 -bottom-6 h-24 w-32 sm:-right-8 sm:-bottom-8 sm:h-36 sm:w-52`} />
    </div>
  )
}
