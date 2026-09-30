import type { ReactNode } from 'react'

interface InlinePageHeaderProps {
  title: string
  description?: string
  action?: ReactNode
}

export function InlinePageHeader({ title, description, action }: InlinePageHeaderProps) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="mb-1 text-xl font-bold text-gray-900">{title}</h1>
        {description && <p className="text-sm text-gray-600">{description}</p>}
      </div>
      {action}
    </div>
  )
}

// `LoadingState` (a centred spinner) lived here until both of its callers — the admin
// dashboard and the profile page — moved to layout-matching skeletons. See the
// `site-loading-skeletons` skill before adding a spinner back.
//
// `StatCard`, `MetricTile`, `GradientMetricTile` and `SectionCard` lived here until the
// overview screens became charts (see `components/overview/`); a metrics block belongs
// in a `ChartCard` now, not in a grid of equal-weight tiles.

export function StatusPill({
  status,
}: {
  status: 'active' | 'inactive' | 'pending' | 'deactivated' | string
}) {
  const styles: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
    pending: 'bg-blue-100 text-blue-800',
    deactivated: 'bg-amber-100 text-amber-800',
    restricted: 'bg-red-100 text-red-800',
  }

  const label = status.charAt(0).toUpperCase() + status.slice(1)

  return (
    <span
      className={`rounded-full px-3 py-1 text-sm font-medium ${styles[status] ?? 'bg-gray-100 text-gray-800'}`}
    >
      {label}
    </span>
  )
}
