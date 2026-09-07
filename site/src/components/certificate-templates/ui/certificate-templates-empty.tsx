import { ScrollText } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CertificateTemplatesEmptyProps {
  /** True when the library is filtered down to nothing rather than genuinely empty. */
  filtered: boolean
  errored: boolean
  onClearFilters: () => void
  onCreate: () => void
}

/** Designed zero state — the screen never renders a bare empty grid. */
export function CertificateTemplatesEmpty({
  filtered,
  errored,
  onClearFilters,
  onCreate,
}: CertificateTemplatesEmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-gray-200 bg-white px-6 py-16 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 text-gray-400">
        <ScrollText className="h-5 w-5" />
      </span>
      <div className="space-y-1">
        <p className="text-[13px] font-semibold text-gray-900">
          {errored
            ? 'Certificate templates could not be loaded'
            : filtered
              ? 'No templates match these filters'
              : 'No certificate templates yet'}
        </p>
        <p className="text-[12px] text-gray-500">
          {errored
            ? 'Refresh the page to try again.'
            : filtered
              ? 'Clear the search, category or status filter to see the full library.'
              : 'Create a template to start issuing certificates for CARES events.'}
        </p>
      </div>
      {!errored &&
        (filtered ? (
          <Button variant="outline" size="sm" onClick={onClearFilters}>
            Clear filters
          </Button>
        ) : (
          <Button size="sm" onClick={onCreate}>
            New template
          </Button>
        ))}
    </div>
  )
}
