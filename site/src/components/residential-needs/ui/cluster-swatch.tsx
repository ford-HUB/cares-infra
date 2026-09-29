import { cn } from '@/lib/utils'
import { CLUSTER_SWATCH_STYLES } from '../../../constants/residential-needs'

interface ClusterSwatchProps {
  index: number
  className?: string
}

/** The dot that identifies a cluster wherever it appears — the same hue as its scatter points. */
export function ClusterSwatch({ index, className }: ClusterSwatchProps) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-block h-2.5 w-2.5 shrink-0 rounded-full',
        CLUSTER_SWATCH_STYLES[index % CLUSTER_SWATCH_STYLES.length],
        className,
      )}
    />
  )
}
