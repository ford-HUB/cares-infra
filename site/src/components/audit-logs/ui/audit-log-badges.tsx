import { AUDIT_CATEGORY_LABELS } from '../../../constants/audit-logs'
import type {
  AuditLogCategory,
  AuditLogOutcome,
  AuditLogSeverity,
} from '../../../types/audit-log'

const severityStyles: Record<AuditLogSeverity, string> = {
  info: 'bg-gray-100 text-gray-600',
  notice: 'bg-blue-50 text-blue-700',
  warning: 'bg-amber-50 text-amber-700',
  critical: 'bg-red-50 text-red-700',
}

const outcomeStyles: Record<AuditLogOutcome, { badge: string; dot: string }> = {
  success: { badge: 'bg-green-50 text-green-700', dot: 'bg-green-500' },
  failure: { badge: 'bg-red-50 text-red-700', dot: 'bg-red-500' },
  denied: { badge: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
}

const categoryStyles: Record<AuditLogCategory, string> = {
  authentication: 'bg-indigo-50 text-indigo-700',
  'access-control': 'bg-purple-50 text-purple-700',
  'user-management': 'bg-sky-50 text-sky-700',
  verification: 'bg-teal-50 text-teal-700',
  event: 'bg-green-50 text-green-700',
  certificate: 'bg-amber-50 text-amber-700',
  communication: 'bg-blue-50 text-blue-700',
  system: 'bg-gray-100 text-gray-600',
}

const chipClass = 'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium'

export function AuditSeverityBadge({ severity }: { severity: AuditLogSeverity }) {
  return (
    <span className={`${chipClass} capitalize ${severityStyles[severity]}`}>
      {severity}
    </span>
  )
}

export function AuditOutcomeBadge({ outcome }: { outcome: AuditLogOutcome }) {
  const style = outcomeStyles[outcome]

  return (
    <span className={`${chipClass} gap-1.5 capitalize ${style.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {outcome}
    </span>
  )
}

export function AuditCategoryBadge({ category }: { category: AuditLogCategory }) {
  return (
    <span className={`${chipClass} ${categoryStyles[category]}`}>
      {AUDIT_CATEGORY_LABELS[category]}
    </span>
  )
}
