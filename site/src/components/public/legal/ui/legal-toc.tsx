import { cn } from '@/lib/utils'
import type { LegalSection } from '../../../../types/legal'

interface LegalTocProps {
  sections: readonly LegalSection[]
  activeId: string
}

/** "On this page" list. Plain hash links, so each section is deep-linkable and the
 *  browser handles the jump; the current section is marked while scrolling. */
export function LegalToc({ sections, activeId }: LegalTocProps) {
  return (
    <ol className="space-y-0.5 text-[13px]">
      {sections.map((section, index) => {
        const active = section.id === activeId
        return (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              aria-current={active ? 'location' : undefined}
              className={cn(
                'flex gap-2 rounded-md border-l-2 px-3 py-1.5 transition-colors focus-visible:ring-2 focus-visible:ring-[var(--cares-primary)] focus-visible:outline-none',
                active
                  ? 'border-[var(--cares-primary-hover)] bg-white font-semibold text-[var(--cares-primary)]'
                  : 'border-transparent text-[var(--cares-body)] hover:text-[var(--cares-primary)]',
              )}
            >
              <span className="w-5 shrink-0 text-[var(--cares-muted)] tabular-nums">{index + 1}.</span>
              <span>{section.title}</span>
            </a>
          </li>
        )
      })}
    </ol>
  )
}
