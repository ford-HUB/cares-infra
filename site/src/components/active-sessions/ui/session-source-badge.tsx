import { Monitor, Smartphone } from 'lucide-react'
import { SESSION_SOURCE_LABELS } from '../../../constants/active-sessions'
import type { SessionSource } from '../../../types/active-session'

const sourceStyles: Record<
  SessionSource,
  { badge: string; icon: typeof Monitor }
> = {
  portal: { badge: 'bg-blue-50 text-blue-700', icon: Monitor },
  mobile: { badge: 'bg-violet-50 text-violet-700', icon: Smartphone },
}

/** Dense badge sized for the active-sessions grid. */
export function SessionSourceBadge({ source }: { source: SessionSource }) {
  const style = sourceStyles[source] ?? sourceStyles.portal
  const Icon = style.icon

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${style.badge}`}
    >
      <Icon className="h-3 w-3" />
      {SESSION_SOURCE_LABELS[source] ?? source}
    </span>
  )
}
