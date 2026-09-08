interface MetricSparklineProps {
  /** Oldest first; a single point draws nothing. */
  values: number[]
  color: string
  label: string
}

const WIDTH = 120
const HEIGHT = 28

/**
 * The tile's history, drawn small: a stat tile answers "what is it now", and the line
 * behind it answers "and is that where it has been" without spending a card on it.
 */
export function MetricSparkline({ values, color, label }: MetricSparklineProps) {
  if (values.length < 2) return null

  const min = Math.min(...values)
  const max = Math.max(...values)
  // A flat series would divide by zero; it draws down the middle instead.
  const span = max - min || 1

  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * WIDTH
    const y = HEIGHT - ((value - min) / span) * (HEIGHT - 4) - 2
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={label}
      className="h-7 w-full"
    >
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
