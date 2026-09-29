import { Card } from '../ui/card'
import { LANDING_PREVIEW } from '../../constants/landing'

/** Illustrative snapshot of the live attendance monitor. The public page is not
 *  authenticated and fetches nothing; these figures are sample data. */
export function LandingPreviewCard() {
  const { eventName, roster, segments } = LANDING_PREVIEW
  const onSite = segments[0].count

  return (
    <Card size="sm" className="w-full shadow-sm ring-foreground/10">
      <div className="flex items-center justify-between gap-3 px-3">
        <div className="min-w-0">
          <p className="text-[11px] tracking-wider text-gray-500 uppercase">Live attendance</p>
          <p className="mt-0.5 truncate text-[13px] font-medium text-gray-700">{eventName}</p>
        </div>
        <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-600">
          <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
          SAMPLE
        </span>
      </div>

      <div className="px-3">
        <p className="flex items-baseline gap-1.5">
          <span className="text-2xl font-semibold text-gray-900 tabular-nums">{onSite}</span>
          <span className="text-[13px] text-gray-500 tabular-nums">of {roster} on site</span>
        </p>

        <div className="mt-2.5 flex h-2 w-full overflow-hidden rounded-full bg-gray-100">
          {segments.map((segment) => (
            <div
              key={segment.label}
              className={segment.barClass}
              style={{ width: `${(segment.count / roster) * 100}%` }}
            />
          ))}
        </div>

        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
          {segments.map((segment) => (
            <li key={segment.label} className="flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${segment.dotClass}`} />
              <span className="text-[12px] text-gray-500">{segment.label}</span>
              <span className="text-[12px] font-semibold text-gray-700 tabular-nums">
                {segment.count}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  )
}
