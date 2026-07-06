import type { ReactNode } from 'react'

interface ContentShellProps {
  children: ReactNode
  /** Dashboard-style pages use max-width constraint; tables use full width. */
  variant?: 'dashboard' | 'full'
  className?: string
}

export function ContentShell({
  children,
  variant = 'dashboard',
  className = '',
}: ContentShellProps) {
  const inner =
    variant === 'dashboard' ? (
      <div className="mx-auto max-w-7xl">{children}</div>
    ) : (
      children
    )

  return (
    <div className={`min-h-full bg-gray-50 p-6 ${className}`}>{inner}</div>
  )
}
