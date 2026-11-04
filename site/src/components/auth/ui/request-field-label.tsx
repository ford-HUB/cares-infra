import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

/** Shared look for the request-access inputs: white, softly outlined, mint focus ring. */
export const REQUEST_FIELD_INPUT =
  'w-full rounded-lg border border-emerald-900/15 bg-white px-3 py-2 text-xs text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/25 focus:outline-none'

interface RequestFieldLabelProps {
  icon: LucideIcon
  htmlFor?: string
  children: ReactNode
}

/** A request-access field label: a green line icon beside bold dark-green text. Renders a
 *  plain heading row when there is no single input to point at (the attachments). */
export function RequestFieldLabel({ icon: Icon, htmlFor, children }: RequestFieldLabelProps) {
  const className =
    'mb-1 flex items-center gap-1.5 text-xs font-bold text-[var(--cares-primary)]'
  const content = (
    <>
      <Icon aria-hidden className="h-3.5 w-3.5 shrink-0 text-green-700" strokeWidth={2.25} />
      {children}
    </>
  )

  return htmlFor ? (
    <label htmlFor={htmlFor} className={className}>
      {content}
    </label>
  ) : (
    <p className={className}>{content}</p>
  )
}
