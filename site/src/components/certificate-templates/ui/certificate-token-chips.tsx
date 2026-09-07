import { Plus } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { CERTIFICATE_TOKENS } from '../../../constants/certificate-design'

/**
 * Inserts a placeholder into the award text — typing `{{recipient}}` by hand invites
 * typos, and the required ones are called out so a director knows what the wording
 * must carry.
 */
export function CertificateTokenChips({
  onInsert,
}: {
  onInsert: (token: string) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {CERTIFICATE_TOKENS.map((entry) => (
        <Tooltip key={entry.token}>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => onInsert(entry.token)}
              className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600 transition-colors hover:bg-gray-200 focus-visible:ring-2 focus-visible:ring-[var(--cares-primary)] focus-visible:outline-none"
            >
              <Plus className="h-3 w-3" />
              {entry.label}
            </button>
          </TooltipTrigger>
          <TooltipContent>
            Inserts {entry.token} — prints as “{entry.sample}”.
            {entry.required ? ' Required.' : ' Optional.'}
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  )
}
