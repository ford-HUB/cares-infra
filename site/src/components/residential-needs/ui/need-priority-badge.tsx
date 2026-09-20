import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  NEED_PRIORITY_BADGE_STYLES,
  NEED_PRIORITY_LABELS,
} from '../../../constants/residential-needs'
import type { NeedPriority } from '../../../types/residential-needs'

interface NeedPriorityBadgeProps {
  priority: NeedPriority
  className?: string
}

/** The priority word, tinted by band — the one place colour is spent on this screen. */
export function NeedPriorityBadge({ priority, className }: NeedPriorityBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className={cn(NEED_PRIORITY_BADGE_STYLES[priority], className)}
    >
      {NEED_PRIORITY_LABELS[priority]}
    </Badge>
  )
}
