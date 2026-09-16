import type { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface ChartCardProps {
  title: string
  /** One line on what the chart answers — the reader should not have to infer it. */
  description: string
  /** A figure that summarises the chart, shown at the top right. */
  aside?: ReactNode
  children: ReactNode
  className?: string
}

/** The frame every chart on the statistics page sits in: quiet title, the plot, nothing else. */
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

/** The one number a chart resolves to, for the card's top-right corner. */
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
