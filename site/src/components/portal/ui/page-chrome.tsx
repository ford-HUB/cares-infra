import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface StatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  color?: string
  subtitle?: string
}

export function StatCard({
  title,
  value,
  icon: Icon,
  color = 'bg-blue-500',
  subtitle,
}: StatCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
        </div>
        <div className={`rounded-lg p-3 ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  )
}

interface InlinePageHeaderProps {
  title: string
  description?: string
  action?: ReactNode
}

export function InlinePageHeader({ title, description, action }: InlinePageHeaderProps) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="mb-1 text-3xl font-bold text-gray-900">{title}</h1>
        {description && <p className="text-gray-600">{description}</p>}
      </div>
      {action}
    </div>
  )
}

interface SectionCardProps {
  title: string
  icon?: LucideIcon
  action?: ReactNode
  children: ReactNode
}

export function SectionCard({ title, icon: Icon, action, children }: SectionCardProps) {
  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
        <div className="flex items-center gap-3">
          {action}
          {Icon && <Icon className="h-5 w-5 text-blue-600" />}
        </div>
      </div>
      {children}
    </div>
  )
}

interface MetricTileProps {
  label: string
  value: string | number
  hint?: string
  icon: LucideIcon
  iconClassName?: string
  valueClassName?: string
}

export function MetricTile({
  label,
  value,
  hint,
  icon: Icon,
  iconClassName = 'text-blue-600',
  valueClassName = 'text-gray-900',
}: MetricTileProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="mb-2 flex items-center space-x-3">
        <Icon className={`h-5 w-5 ${iconClassName}`} />
        <p className="text-sm text-gray-600">{label}</p>
      </div>
      <p className={`text-2xl font-bold ${valueClassName}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  )
}

interface GradientMetricTileProps {
  label: string
  value: string | number
  gradientClass: string
  borderClass: string
  valueClass: string
}

export function GradientMetricTile({
  label,
  value,
  gradientClass,
  borderClass,
  valueClass,
}: GradientMetricTileProps) {
  return (
    <div className={`rounded-lg border p-4 ${gradientClass} ${borderClass}`}>
      <p className="mb-1 text-sm text-gray-600">{label}</p>
      <p className={`text-2xl font-bold ${valueClass}`}>{value}</p>
    </div>
  )
}

export function LoadingState({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
        <p className="mt-4 text-gray-600">{message}</p>
      </div>
    </div>
  )
}

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
