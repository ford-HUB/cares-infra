interface LivePulseProps {
  /** Tailwind background class for the dot, e.g. `bg-emerald-500`. */
  colorClass: string
  /** Only a live geofence capture animates; a settled state shows a still dot. */
  animate?: boolean
}

/**
 * The one moving part of the monitor: a dot with an expanding ring behind it, marking
 * a volunteer whose coordinates are still arriving. Keeping the animation to this
 * single element is deliberate — a table where every row shimmers is unreadable.
 */
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
