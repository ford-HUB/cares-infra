import type { PermissionSource } from '../../../types/access-control'

interface RightsBadgesProps {
  granted: number
  revoked: number
  suspended: number
}

const badgeBase =
  'inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium'

/** Counts of how far a user departs from their role baseline, for the table row. */
export function RightsBadges({ granted, revoked, suspended }: RightsBadgesProps) {
  if (granted === 0 && revoked === 0 && suspended === 0) {
    return <span className="text-[12px] text-gray-400">Role default</span>
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {granted > 0 && (
        <span className={`${badgeBase} bg-green-50 text-green-700`}>+{granted}</span>
      )}
      {revoked > 0 && (
        <span className={`${badgeBase} bg-gray-100 text-gray-600`}>−{revoked}</span>
      )}
      {suspended > 0 && (
        <span className={`${badgeBase} bg-red-50 text-red-700`}>
          {suspended} suspended
        </span>
      )}
    </div>
  )
}

const SOURCE_STYLES: Record<PermissionSource, { label: string; className: string }> = {
  inherited: { label: 'From role', className: 'bg-gray-100 text-gray-600' },
  granted: { label: 'Granted', className: 'bg-green-50 text-green-700' },
  revoked: { label: 'Revoked', className: 'bg-amber-50 text-amber-700' },
  suspended: { label: 'Suspended', className: 'bg-red-50 text-red-700' },
  unset: { label: '', className: '' },
}

/** Why one permission is on or off — the per-row explanation inside the rights panel. */
export function PermissionSourceBadge({ source }: { source: PermissionSource }) {
  if (source === 'unset') return null

  const style = SOURCE_STYLES[source]
  return <span className={`${badgeBase} ${style.className}`}>{style.label}</span>
}
