import type { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'

interface UsageCardProps {
  title: string
  /** One line on how to read the block. */
  hint?: string
  /** Current reading, legend or action — sits opposite the title. */
  aside?: ReactNode
  children: ReactNode
  className?: string
}

/** Shared frame for the screen's panels, so the charts and lists read as one report. */
export function UsageCard({ title, hint, aside, children, className = '' }: UsageCardProps) {
  return (
    <Card className={`gap-0 shadow-sm ${className}`}>
      <CardContent className="flex h-full flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-wider text-gray-500 uppercase">
              {title}
            </p>
            {hint && <p className="mt-0.5 text-[12px] text-gray-500">{hint}</p>}
          </div>
          {aside}
        </div>
        {children}
      </CardContent>
    </Card>
  )
}
