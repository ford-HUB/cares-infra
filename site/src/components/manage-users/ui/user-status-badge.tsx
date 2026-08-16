import type { ManagedUser } from '../../../types/manage-users'

const statusStyles: Record<ManagedUser['status'], { badge: string; dot: string }> = {
  active: { badge: 'bg-green-50 text-green-700', dot: 'bg-green-500' },
  pending: { badge: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
  restricted: { badge: 'bg-red-50 text-red-700', dot: 'bg-red-500' },
}

/** Dense badge sized for the users grid — the roomier `StatusPill` is for detail views. */
export function UserStatusBadge({ status }: { status: ManagedUser['status'] }) {
  const style = statusStyles[status] ?? statusStyles.restricted

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${style.badge}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {status}
    </span>
  )
}
