import { LOGIN_OUTCOME_LABELS } from '../../../constants/login-activity'
import type { LoginOutcome } from '../../../types/login-activity'

const outcomeStyles: Record<LoginOutcome, { badge: string; dot: string }> = {
  success: { badge: 'bg-green-50 text-green-700', dot: 'bg-green-500' },
  'invalid-credentials': { badge: 'bg-red-50 text-red-700', dot: 'bg-red-500' },
  'blocked-ip': { badge: 'bg-red-50 text-red-700', dot: 'bg-red-600' },
  'restricted-account': { badge: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  'role-not-allowed': { badge: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  'locked-out': { badge: 'bg-red-50 text-red-700', dot: 'bg-red-600' },
  'outside-login-hours': { badge: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  'ip-not-allowed': { badge: 'bg-red-50 text-red-700', dot: 'bg-red-600' },
  'credential-expired': { badge: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
}

/** Dense badge sized for the login-activity grid. */
export function LoginOutcomeBadge({ outcome }: { outcome: LoginOutcome }) {
  const style = outcomeStyles[outcome] ?? outcomeStyles['invalid-credentials']

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${style.badge}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {LOGIN_OUTCOME_LABELS[outcome] ?? outcome}
    </span>
  )
}
