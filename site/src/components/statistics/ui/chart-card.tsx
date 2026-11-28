import type { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface ChartCardProps {
  title: string
  description: string
  aside?: ReactNode
  children: ReactNode
  className?: string
}

export function ChartCard({
  title,
  description,
  aside,
  children,
  className,
}: ChartCardProps) {
  return (
    <Card size="sm" className={cn('min-w-0 shadow-sm', className)}>
      <CardContent className="flex h-full flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-gray-900">{title}</p>
            <p className="text-[12px] text-gray-500">{description}</p>
          </div>
          {aside && <div className="shrink-0 text-right">{aside}</div>}
        </div>
        {children}
      </CardContent>
    </Card>
  )
}

interface ChartFigureProps {
  value: string
  label: string
}

export function ChartFigure({ value, label }: ChartFigureProps) {
  return (
    <>
      <p className="text-lg leading-tight font-semibold text-gray-900 tabular-nums">
        {value}
      </p>
      <p className="text-[11px] text-gray-400">{label}</p>
    </>
  )
}
