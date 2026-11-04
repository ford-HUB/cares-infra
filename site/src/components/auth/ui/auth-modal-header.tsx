import { LANDING_BANNER_SERIF } from '../../../constants/landing-bulletin'
import { cn } from '@/lib/utils'
import { AuthModalTitle } from './auth-modal'
import { modalReveal } from './modal-reveal'

interface AuthModalHeaderProps {
  title: string
  description: string
  /** Label set into the rule that separates the header from the form. */
  dividerLabel: string
}

/** Centred title and blurb, then a labelled rule leading into the form. */
export function AuthModalHeader({ title, description, dividerLabel }: AuthModalHeaderProps) {
  const heading = modalReveal(0, 'heading')
  const blurb = modalReveal(1)
  const divider = modalReveal(2)

  return (
    <header className="mb-4">
      {/* Even side padding keeps the centred text clear of the close button. */}
      <div className="px-6 text-center">
        <AuthModalTitle asChild>
          <h1
            // The typeface stays outside cn: tailwind-merge reads font-[…] and font-bold as
            // clashing weights and would drop it.
            className={`${LANDING_BANNER_SERIF} ${cn(
              'text-2xl leading-tight font-bold text-[var(--cares-primary)]',
              heading.className,
            )}`}
            style={heading.style}
          >
            {title}
          </h1>
        </AuthModalTitle>
        <p
          className={cn('mt-1 text-sm leading-snug text-[var(--cares-muted)]', blurb.className)}
          style={blurb.style}
        >
          {description}
        </p>
      </div>

      {/* The label sits on a glossy green glass pill: a light top edge, a soft sheen over
          its upper half and a green glow beneath, in bold white capitals. */}
      <div className={cn('mt-4 flex items-center gap-3', divider.className)} style={divider.style}>
        <span aria-hidden className="h-0.5 flex-1 rounded-full bg-gradient-to-r from-transparent to-[var(--cares-primary)]" />
        <span className="relative isolate overflow-hidden rounded-full border border-emerald-300/40 bg-gradient-to-b from-green-600 via-green-700 to-green-800 px-4 py-1 text-[11px] font-bold tracking-[0.08em] text-white uppercase shadow-[0_6px_16px_-8px_rgba(20,83,45,0.7),inset_0_1px_0_rgba(255,255,255,0.3)] ring-1 ring-green-900/30">
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-1/2 bg-gradient-to-b from-white/20 to-transparent"
          />
          {dividerLabel}
        </span>
        <span aria-hidden className="h-0.5 flex-1 rounded-full bg-gradient-to-l from-transparent to-[var(--cares-primary)]" />
      </div>
    </header>
  )
}
