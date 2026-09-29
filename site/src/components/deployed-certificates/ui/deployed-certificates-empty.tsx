import { Rocket } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface DeployedCertificatesEmptyProps {
  /** True when the log is filtered down to nothing rather than genuinely empty. */
  filtered: boolean
  errored: boolean
  onClearFilters: () => void
  onBrowseTemplates: () => void
}

/** Designed zero state — the screen never renders a bare empty grid. */
export function DeployedCertificatesEmpty({
  filtered,
  errored,
  onClearFilters,
  onBrowseTemplates,
}: DeployedCertificatesEmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-gray-200 bg-white px-6 py-16 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 text-gray-400">
        <Rocket className="h-5 w-5" />
      </span>
      <div className="space-y-1">
        <p className="text-[13px] font-semibold text-gray-900">
          {errored
            ? 'Deployed certificates could not be loaded'
            : filtered
              ? 'No deployments match these filters'
              : 'No certificate is deployed yet'}
        </p>
        <p className="text-[12px] text-gray-500">
          {errored
            ? 'Refresh the page to try again.'
            : filtered
              ? 'Clear the search, event or status filter to see every deployment.'
              : 'Customize a template, then deploy it to an event to start distributing.'}
        </p>
      </div>
      {!errored &&
        (filtered ? (
          <Button variant="outline" size="sm" onClick={onClearFilters}>
            Clear filters
          </Button>
        ) : (
          <Button size="sm" onClick={onBrowseTemplates}>
            Go to Customization
          </Button>
        ))}
    </div>
  )
}
