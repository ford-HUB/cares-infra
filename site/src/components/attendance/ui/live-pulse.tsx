interface LivePulseProps {
  /** Tailwind bg class, e.g. `bg-emerald-500`. */
  colorClass: string
  animate?: boolean
}

export function LivePulse({ colorClass, animate = false }: LivePulseProps) {
  return (
    <span aria-hidden className="relative flex h-2 w-2 shrink-0">
      {animate && (
        <span
          className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${colorClass}`}
        />
      )}
      <span className={`relative inline-flex h-2 w-2 rounded-full ${colorClass}`} />
    </span>
  )
}
