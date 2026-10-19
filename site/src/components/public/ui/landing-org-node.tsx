import { cn } from '@/lib/utils'
import { useReveal } from '../../../hooks/use-reveal'
import type { LandingOrgPerson } from '../../../constants/landing-org'

interface LandingOrgPersonNodeProps {
  person: LandingOrgPerson
  emphasis?: boolean
}

/** One named position in the chart's spine: portrait, name, title. */
export function LandingOrgPersonNode({ person, emphasis = false }: LandingOrgPersonNodeProps) {
  return (
    <div
      className={cn(
        'group flex w-full max-w-xs items-center gap-3 rounded-xl p-3 shadow-sm ring-1 transition-shadow duration-300 hover:shadow-md',
        emphasis
          ? 'bg-[var(--cares-primary)] text-white ring-[var(--cares-primary)]'
          : 'bg-white text-gray-900 ring-gray-200',
      )}
    >
      <span
        className={cn(
          'h-14 w-14 shrink-0 overflow-hidden rounded-full ring-2 transition-[box-shadow] duration-300',
          emphasis ? 'ring-emerald-300' : 'ring-emerald-100 group-hover:ring-emerald-300',
        )}
      >
        <img
          src={person.photo}
          alt={person.name}
          loading="lazy"
          className="h-full w-full scale-110 object-cover object-top"
        />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[14px] font-semibold">{person.name}</p>
        <p
          className={cn(
            'text-[11px] tracking-wider uppercase',
            emphasis ? 'text-emerald-200' : 'text-gray-500',
          )}
        >
          {person.role}
        </p>
      </div>
    </div>
  )
}

/** An unnamed group in the chart (faculty, students). */
export function LandingOrgGroupNode({ label }: { label: string }) {
  return (
    <div className="w-full max-w-xs rounded-xl border border-dashed border-emerald-300 bg-emerald-50/60 px-4 py-3 text-center text-[13px] font-medium text-emerald-900">
      {label}
    </div>
  )
}

/** Vertical link in the spine. It draws itself downward on first view. */
export function LandingOrgConnector({ className }: { className?: string }) {
  const { ref, visible } = useReveal<HTMLSpanElement>(0.6)

  return (
    <span
      ref={ref}
      aria-hidden
      className={cn(
        'mx-auto block h-8 w-px origin-top bg-emerald-300 motion-safe:transition-transform motion-safe:duration-500',
        visible ? 'scale-y-100' : 'motion-safe:scale-y-0',
        className,
      )}
    />
  )
}
