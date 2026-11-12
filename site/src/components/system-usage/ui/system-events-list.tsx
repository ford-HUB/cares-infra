import { AlertOctagon, AlertTriangle, Info } from 'lucide-react'
import { useState } from 'react'
import {
  EVENT_SEVERITY_LABELS,
  EVENT_SEVERITY_STYLES,
  SYSTEM_EVENTS_PREVIEW,
  formatEventTime,
} from '../../../constants/system-usage'
import type { SystemEvent, SystemEventSeverity } from '../../../types/system-usage'
import { UsageCard } from './usage-card'

const SEVERITY_ICONS: Record<SystemEventSeverity, typeof Info> = {
  info: Info,
  warning: AlertTriangle,
  critical: AlertOctagon,
}

/** What happened to the system recently — newest first, severity as icon + word. */
export function SystemEventsList({ events }: { events: SystemEvent[] }) {
  const [expanded, setExpanded] = useState(false)
  const shown = expanded ? events : events.slice(0, SYSTEM_EVENTS_PREVIEW)

  return (
    <UsageCard title="Recent system events" hint="Spikes, restarts and outages.">
      {events.length === 0 ? (
        <p className="py-6 text-center text-[13px] text-gray-500">Nothing to report in this range.</p>
      ) : (
        <ul className="-mx-1 flex flex-col">
          {shown.map((event) => {
            const Icon = SEVERITY_ICONS[event.severity]
            return (
              <li key={event.id} className="flex gap-3 rounded-lg px-1 py-2">
                <span
                  aria-hidden
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${EVENT_SEVERITY_STYLES[event.severity]}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] text-gray-800">{event.title}</p>
                  <p className="text-[11px] text-gray-400">
                    {EVENT_SEVERITY_LABELS[event.severity]} · {event.source} · {formatEventTime(event.at)}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
      {events.length > SYSTEM_EVENTS_PREVIEW && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-auto self-start rounded-md px-1 text-[12px] font-medium text-gray-600 transition-colors hover:text-gray-900 focus-visible:ring-2 focus-visible:ring-[var(--cares-primary)] focus-visible:outline-none"
        >
          {expanded ? 'Show fewer' : `Show all ${events.length}`}
        </button>
      )}
    </UsageCard>
  )
}
