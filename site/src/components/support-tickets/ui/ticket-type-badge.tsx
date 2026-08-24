import {
  AlertTriangle,
  Bug,
  CalendarDays,
  HelpCircle,
  KeyRound,
  Lightbulb,
  Smartphone,
  UserCog,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { TICKET_TYPE_LABELS } from '../../../constants/support-tickets'
import type { SupportTicketType } from '../../../types/support-ticket'

const typeStyles: Record<SupportTicketType, { icon: LucideIcon; className: string }> = {
  bug: { icon: Bug, className: 'bg-red-50 text-red-700' },
  login: { icon: KeyRound, className: 'bg-purple-50 text-purple-700' },
  account: { icon: UserCog, className: 'bg-sky-50 text-sky-700' },
  verification: { icon: AlertTriangle, className: 'bg-amber-50 text-amber-700' },
  event: { icon: CalendarDays, className: 'bg-emerald-50 text-emerald-700' },
  mobile_app: { icon: Smartphone, className: 'bg-indigo-50 text-indigo-700' },
  feature_request: { icon: Lightbulb, className: 'bg-teal-50 text-teal-700' },
  other: { icon: HelpCircle, className: 'bg-gray-100 text-gray-600' },
}

/** Ticket type is the first thing triage reads, so it carries an icon as well as a label. */
export function TicketTypeBadge({ type }: { type: SupportTicketType }) {
  const style = typeStyles[type] ?? typeStyles.other
  const Icon = style.icon

  return (
    <span
      className={`inline-flex max-w-full items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[11px] font-medium ${style.className}`}
    >
      <Icon className="h-3 w-3 shrink-0" />
      <span className="truncate">{TICKET_TYPE_LABELS[type]}</span>
    </span>
  )
}
