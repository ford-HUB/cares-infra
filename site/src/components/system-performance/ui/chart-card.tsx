import type { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'

interface ChartCardProps {
  title: string
  /** One line on how to read the chart — these are not self-evident measurements. */
  hint: string
  /** Legend, current reading, or range note; sits opposite the title. */
  aside?: ReactNode
  children: ReactNode
}

/** Shared frame for the page's charts, so two plots read as one instrument panel. */
export function ChartCard({ title, hint, aside, children }: ChartCardProps) {
  return (
    <Card className="gap-0 shadow-sm">
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-wider text-gray-500 uppercase">
              {title}
            </p>
            <p className="mt-0.5 text-[12px] text-gray-500">{hint}</p>
          </div>
          {aside}
        </div>
        {children}
      </CardContent>
    </Card>
  )
}
